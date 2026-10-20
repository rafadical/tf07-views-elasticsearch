import type { PaginatedResponse, User } from "../types/api";

export type UserSearchMessageVariant = "muted" | "warning" | "danger";

/** Mostra uma mensagem no lugar dos resultados (texto vazio, nenhum resultado, erro, carregando). */
export function userSearchMessageRender(container: HTMLElement, message: string, variant: UserSearchMessageVariant = "muted"): void {
  container.innerHTML = "";

  const messageElement = document.createElement("div");
  messageElement.classList.add("small", `text-${variant}`);
  messageElement.innerText = message;

  container.append(messageElement);
}

/** Texto "Cidade/UF", tratando perfis sem cidade ou sem UF. */
function locationText(user: User): string {
  const parts = [user.city, user.state].filter((part): part is string => Boolean(part));

  if (parts.length === 0) return "Local não informado";

  return parts.join("/");
}

function userResultRender(user: User, onChoose: (user: User) => void): HTMLLIElement {
  const liElement = document.createElement("li");
  liElement.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-center", "gap-3");

  const infoElement = document.createElement("div");
  infoElement.classList.add("flex-grow-1");

  const nameElement = document.createElement("div");
  nameElement.classList.add("fw-semibold");
  nameElement.innerText = user.name;

  const emailElement = document.createElement("div");
  emailElement.classList.add("small");
  emailElement.innerText = user.email;

  const detailsElement = document.createElement("div");
  detailsElement.classList.add("small", "text-muted");
  detailsElement.innerText = `${user.job_title ?? "Cargo não informado"} · ${locationText(user)}`;

  infoElement.append(nameElement, emailElement, detailsElement);

  const chooseButton = document.createElement("button");
  chooseButton.type = "button";
  chooseButton.classList.add("btn", "btn-outline-primary", "btn-sm");
  chooseButton.innerText = "Escolher";
  chooseButton.addEventListener("click", () => onChoose(user));

  liElement.append(infoElement, chooseButton);

  return liElement;
}

/** Lista os usuários encontrados, com o total e um botão "Escolher" em cada um. */
export default function userSearchResultsRender(
  container: HTMLElement,
  result: PaginatedResponse<User>,
  onChoose: (user: User) => void,
): void {
  if (result.data.length === 0) {
    userSearchMessageRender(container, "Nenhum usuário encontrado para essa busca.", "warning");
    return;
  }

  container.innerHTML = "";

  const totalElement = document.createElement("div");
  totalElement.classList.add("small", "text-muted", "mb-2");
  totalElement.innerText = `${result.total} usuário(s) encontrado(s)`;

  if (result.total > result.data.length) {
    totalElement.innerText += ` (mostrando os ${result.data.length} primeiros)`;
  }

  const ulElement = document.createElement("ul");
  ulElement.classList.add("list-group");

  result.data.forEach((user) => {
    ulElement.append(userResultRender(user, onChoose));
  });

  container.append(totalElement, ulElement);
}
