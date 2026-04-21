import { ApiError, apiRequest } from "@/api/client";
import type { PersonRecord } from "@/types/models";

type ApiData<T> = {
  data: T;
};

export async function getPeople() {
  const response = await apiRequest<ApiData<PersonRecord[]>>("/people", {
    method: "GET",
  });

  return response.data;
}

export async function getPersonBySlug(slug: string) {
  try {
    const response = await apiRequest<ApiData<PersonRecord>>(`/people/${slug}`, {
      method: "GET",
    });

    return response.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function getArtists() {
  const people = await getPeople();
  return people.filter((person) => person.isArtist);
}
