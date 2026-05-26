param(
  [switch]$Check
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$BackendRoot = Split-Path -Parent $PSScriptRoot
$EnvPath = Join-Path $BackendRoot ".env"
$DefaultMediaRoot = Join-Path $BackendRoot "storage\media"

function Read-DotEnv {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "Missing .env file at $Path"
  }

  $values = @{}

  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = $line.Trim()

    if ($trimmed.Length -eq 0 -or $trimmed.StartsWith("#")) {
      continue
    }

    if ($line -match "^\s*([^#=\s]+)\s*=\s*(.*)\s*$") {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim()

      if (
        ($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))
      ) {
        $value = $value.Substring(1, $value.Length - 2)
      }

      $values[$name] = $value
    }
  }

  return $values
}

function Get-ConfigValue {
  param(
    [hashtable]$DotEnv,
    [string]$Name,
    [string]$Default = $null
  )

  $processValue = [Environment]::GetEnvironmentVariable($Name, "Process")

  if (-not [string]::IsNullOrWhiteSpace($processValue)) {
    return $processValue
  }

  if ($DotEnv.ContainsKey($Name)) {
    return $DotEnv[$Name]
  }

  return $Default
}

function Resolve-ConfiguredPath {
  param(
    [string]$Value,
    [string]$BasePath
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Path value is empty."
  }

  $expanded = [Environment]::ExpandEnvironmentVariables($Value.Trim())

  if ($expanded.StartsWith("~")) {
    $relativeHomePath = $expanded.Substring(1).TrimStart("\", "/")
    $expanded = Join-Path $HOME $relativeHomePath
  }

  if ([System.IO.Path]::IsPathRooted($expanded)) {
    return [System.IO.Path]::GetFullPath($expanded)
  }

  return [System.IO.Path]::GetFullPath((Join-Path $BasePath $expanded))
}

function ConvertTo-ProcessArgument {
  param([string]$Value)

  if ($Value -notmatch '[\s"]') {
    return $Value
  }

  $quoted = $Value -replace '(\\*)"', '$1$1\"'
  $quoted = $quoted -replace '(\\+)$', '$1$1'

  return '"' + $quoted + '"'
}

function Find-Executable {
  param(
    [string[]]$Names,
    [string[]]$FallbackPaths
  )

  foreach ($name in $Names) {
    $command = Get-Command $name -ErrorAction SilentlyContinue

    if ($command -and $command.Source) {
      return $command.Source
    }
  }

  foreach ($path in $FallbackPaths) {
    if (Test-Path -LiteralPath $path -PathType Leaf) {
      return $path
    }
  }

  throw "Could not find mysqldump. Add MySQL Server bin to PATH or install MySQL Server locally."
}

function Parse-DatabaseUrl {
  param([string]$DatabaseUrl)

  if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
    throw "DATABASE_URL is required."
  }

  try {
    $uri = [System.Uri]::new($DatabaseUrl)
  } catch {
    throw "DATABASE_URL is not a valid URI: $($_.Exception.Message)"
  }

  if ($uri.Scheme -ne "mysql") {
    throw "DATABASE_URL must use the mysql:// scheme."
  }

  if ([string]::IsNullOrWhiteSpace($uri.Host)) {
    throw "DATABASE_URL must include a host."
  }

  $userInfoParts = $uri.UserInfo -split ":", 2
  $databaseUser = [System.Uri]::UnescapeDataString($userInfoParts[0])
  $databasePassword = ""

  if ($userInfoParts.Count -gt 1) {
    $databasePassword = [System.Uri]::UnescapeDataString($userInfoParts[1])
  }

  if ([string]::IsNullOrWhiteSpace($databaseUser)) {
    throw "DATABASE_URL must include a MySQL user."
  }

  $databaseName = [System.Uri]::UnescapeDataString($uri.AbsolutePath.TrimStart("/"))

  if ([string]::IsNullOrWhiteSpace($databaseName)) {
    throw "DATABASE_URL must include a database name."
  }

  $databasePort = 3306

  if ($uri.Port -gt 0) {
    $databasePort = $uri.Port
  }

  return [pscustomobject]@{
    Host = $uri.Host
    Port = $databasePort
    User = $databaseUser
    Password = $databasePassword
    Name = $databaseName
  }
}

function Get-BackupConfig {
  $dotEnv = Read-DotEnv -Path $EnvPath
  $database = Parse-DatabaseUrl -DatabaseUrl (Get-ConfigValue -DotEnv $dotEnv -Name "DATABASE_URL")
  $outputDirValue = Get-ConfigValue -DotEnv $dotEnv -Name "BACKUP_OUTPUT_DIR"

  if ([string]::IsNullOrWhiteSpace($outputDirValue)) {
    throw "BACKUP_OUTPUT_DIR is required. Set it in backend\.env to a cloud, external, or synced folder."
  }

  $retentionDaysValue = Get-ConfigValue -DotEnv $dotEnv -Name "BACKUP_RETENTION_DAYS" -Default "30"
  $retentionDays = 30

  if (-not [int]::TryParse($retentionDaysValue, [ref]$retentionDays) -or $retentionDays -lt 0) {
    throw "BACKUP_RETENTION_DAYS must be a non-negative integer."
  }

  $mediaRootValue = Get-ConfigValue -DotEnv $dotEnv -Name "MEDIA_LOCAL_ROOT" -Default $DefaultMediaRoot

  return [pscustomobject]@{
    DotEnv = $dotEnv
    Database = $database
    OutputDir = Resolve-ConfiguredPath -Value $outputDirValue -BasePath $BackendRoot
    RetentionDays = $retentionDays
    MediaRoot = Resolve-ConfiguredPath -Value $mediaRootValue -BasePath $BackendRoot
    MysqldumpPath = Find-Executable -Names @("mysqldump.exe", "mysqldump") -FallbackPaths @(
      "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe",
      "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe",
      "C:\Program Files\MariaDB 11.4\bin\mysqldump.exe",
      "C:\Program Files\MariaDB 10.11\bin\mysqldump.exe"
    )
  }
}

function Test-DirectoryWritable {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }

  $probePath = Join-Path $Path ".backup-write-test-$PID.tmp"

  try {
    Set-Content -LiteralPath $probePath -Value "ok" -NoNewline -Encoding UTF8
  } finally {
    if (Test-Path -LiteralPath $probePath -PathType Leaf) {
      Remove-Item -LiteralPath $probePath -Force
    }
  }
}

function Test-BackupPrerequisites {
  param([pscustomobject]$Config)

  if (-not (Test-Path -LiteralPath $EnvPath -PathType Leaf)) {
    throw "Missing .env file at $EnvPath"
  }

  if (-not (Test-Path -LiteralPath $Config.MysqldumpPath -PathType Leaf)) {
    throw "mysqldump was resolved but does not exist: $($Config.MysqldumpPath)"
  }

  if (-not (Test-Path -LiteralPath $Config.MediaRoot -PathType Container)) {
    throw "Media folder is missing or is not a directory: $($Config.MediaRoot)"
  }

  Get-ChildItem -LiteralPath $Config.MediaRoot -Force -ErrorAction Stop | Out-Null
  Test-DirectoryWritable -Path $Config.OutputDir

  Write-Host "[OK] .env: $EnvPath"
  Write-Host "[OK] DATABASE_URL: mysql://$($Config.Database.User)@$($Config.Database.Host):$($Config.Database.Port)/$($Config.Database.Name)"
  Write-Host "[OK] mysqldump: $($Config.MysqldumpPath)"
  Write-Host "[OK] media folder: $($Config.MediaRoot)"
  Write-Host "[OK] backup output: $($Config.OutputDir)"
  Write-Host "[OK] retention days: $($Config.RetentionDays)"
}

function Invoke-Mysqldump {
  param(
    [pscustomobject]$Config,
    [string]$OutputPath
  )

  $arguments = @(
    "--host=$($Config.Database.Host)",
    "--port=$($Config.Database.Port)",
    "--user=$($Config.Database.User)",
    "--single-transaction",
    "--quick",
    "--routines",
    "--triggers",
    "--events",
    "--default-character-set=utf8mb4",
    $Config.Database.Name
  )

  $processInfo = New-Object System.Diagnostics.ProcessStartInfo
  $processInfo.FileName = $Config.MysqldumpPath
  $processInfo.Arguments = ($arguments | ForEach-Object { ConvertTo-ProcessArgument $_ }) -join " "
  $processInfo.UseShellExecute = $false
  $processInfo.CreateNoWindow = $true
  $processInfo.RedirectStandardOutput = $true
  $processInfo.RedirectStandardError = $true

  if ($Config.Database.Password.Length -gt 0) {
    $processInfo.EnvironmentVariables["MYSQL_PWD"] = $Config.Database.Password
  } elseif ($processInfo.EnvironmentVariables.ContainsKey("MYSQL_PWD")) {
    $processInfo.EnvironmentVariables.Remove("MYSQL_PWD")
  }

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $processInfo
  $outputStream = [System.IO.File]::Open($OutputPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)

  try {
    [void]$process.Start()
    $stdoutTask = $process.StandardOutput.BaseStream.CopyToAsync($outputStream)
    $stderrTask = $process.StandardError.ReadToEndAsync()

    $process.WaitForExit()
    [void]$stdoutTask.GetAwaiter().GetResult()
    $stderr = $stderrTask.GetAwaiter().GetResult()

    if ($process.ExitCode -ne 0) {
      throw "mysqldump failed with exit code $($process.ExitCode): $stderr"
    }
  } finally {
    $outputStream.Dispose()

    if ($process -and -not $process.HasExited) {
      $process.Kill()
    }

    if ($process) {
      $process.Dispose()
    }
  }

  $dumpItem = Get-Item -LiteralPath $OutputPath

  if ($dumpItem.Length -le 0) {
    throw "mysqldump completed but database.sql is empty."
  }
}

function Compress-MediaFolder {
  param(
    [string]$MediaRoot,
    [string]$OutputPath
  )

  if (Test-Path -LiteralPath $OutputPath -PathType Leaf) {
    Remove-Item -LiteralPath $OutputPath -Force
  }

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::CreateFromDirectory($MediaRoot, $OutputPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)
}

function Invoke-RetentionCleanup {
  param(
    [string]$OutputDir,
    [string]$CurrentBackupDir,
    [int]$RetentionDays
  )

  $cutoff = (Get-Date).AddDays(-1 * $RetentionDays)
  $currentBackupPath = [System.IO.Path]::GetFullPath($CurrentBackupDir).TrimEnd("\")
  $deleted = @()

  Get-ChildItem -LiteralPath $OutputDir -Directory -Filter "kisii-art-collective-*" |
    Where-Object {
      ([System.IO.Path]::GetFullPath($_.FullName).TrimEnd("\") -ne $currentBackupPath) -and
      ($_.LastWriteTime -lt $cutoff)
    } |
    ForEach-Object {
      $deleted += $_.FullName
      Remove-Item -LiteralPath $_.FullName -Recurse -Force
    }

  return $deleted
}

function Invoke-Backup {
  param([pscustomobject]$Config)

  Test-BackupPrerequisites -Config $Config

  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backupBaseDir = Join-Path $Config.OutputDir "kisii-art-collective-$timestamp"
  $backupDir = $backupBaseDir
  $collisionIndex = 1

  while (Test-Path -LiteralPath $backupDir) {
    $backupDir = "$backupBaseDir-$collisionIndex"
    $collisionIndex += 1
  }

  $databaseDumpPath = Join-Path $backupDir "database.sql"
  $mediaZipPath = Join-Path $backupDir "media.zip"
  $manifestPath = Join-Path $backupDir "manifest.json"

  New-Item -ItemType Directory -Path $backupDir | Out-Null

  Write-Host "[RUN] Dumping MySQL database..."
  Invoke-Mysqldump -Config $Config -OutputPath $databaseDumpPath

  Write-Host "[RUN] Archiving media folder..."
  Compress-MediaFolder -MediaRoot $Config.MediaRoot -OutputPath $mediaZipPath

  $mediaFileCount = @(Get-ChildItem -LiteralPath $Config.MediaRoot -Recurse -File -Force).Count
  $databaseDump = Get-Item -LiteralPath $databaseDumpPath
  $mediaZip = Get-Item -LiteralPath $mediaZipPath

  $manifest = [ordered]@{
    createdAt = (Get-Date).ToUniversalTime().ToString("o")
    backupDirectory = $backupDir
    retentionDays = $Config.RetentionDays
    database = [ordered]@{
      name = $Config.Database.Name
      host = $Config.Database.Host
      port = $Config.Database.Port
      dumpFile = "database.sql"
      bytes = $databaseDump.Length
    }
    media = [ordered]@{
      path = $Config.MediaRoot
      archiveFile = "media.zip"
      fileCount = $mediaFileCount
      bytes = $mediaZip.Length
    }
    source = [ordered]@{
      backendRoot = $BackendRoot
      script = $PSCommandPath
    }
  }

  $manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

  $deletedBackups = Invoke-RetentionCleanup -OutputDir $Config.OutputDir -CurrentBackupDir $backupDir -RetentionDays $Config.RetentionDays

  Write-Host "[OK] Backup created: $backupDir"
  Write-Host "[OK] database.sql bytes: $($databaseDump.Length)"
  Write-Host "[OK] media.zip bytes: $($mediaZip.Length)"
  Write-Host "[OK] manifest.json: $manifestPath"

  if ($deletedBackups.Count -gt 0) {
    Write-Host "[OK] Deleted old backups: $($deletedBackups.Count)"
  } else {
    Write-Host "[OK] No old backups deleted."
  }
}

try {
  $config = Get-BackupConfig

  if ($Check) {
    Test-BackupPrerequisites -Config $config
    Write-Host "[OK] Backup prerequisite check passed."
  } else {
    Invoke-Backup -Config $config
  }

  exit 0
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
