import clientApi from "./_clientApi";
import type { PaginatedResponse, User, UserSearchFilters } from "../types/api";

export async function userSearchApi(filters: UserSearchFilters, page = 1, limit = 10): Promise<PaginatedResponse<User>> {
  const { data } = await clientApi.post<PaginatedResponse<User>>("/users/search", { filters, page, limit });

  return data;
}
