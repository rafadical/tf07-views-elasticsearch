import { isAxiosError } from "axios";
import { userSearchApi } from "../api/userSearchApi";
import { taskCreateApi } from "../api/taskCreateApi";
import tasksListRender from "../render/tasksListRender";
import userSearchResultsRender, { userSearchMessageRender } from "../render/userSearchResultsRender";
import type { User, UserSearchFilters, UserSearchTextField } from "../types/api";

const SEARCH_FIELDS: readonly UserSearchTextField[] = ["name", "email", "job_title", "bio", "city", "state"];

function isSearchField(value: string): value is UserSearchTextField {
  return (SEARCH_FIELDS as readonly string[]).includes(value);
}

/**
 * Erros 4xx trazem uma mensagem útil do backend ({ error: "..." }).
 * Erro 5xx ou falha de rede: mostra o texto padrão, mais amigável.
 */
function apiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError<{ error?: string }>(error)) return fallback;

  const status = error.response?.status ?? 500;

  if (status >= 500) return fallback;

  return error.response?.data?.error ?? fallback;
}

export default function assignTaskModalListeners(idUser: number): void {
  const modalElement = document.querySelector<HTMLDivElement>("#assign-task-modal");
  const taskNameInput = document.querySelector<HTMLInputElement>("#assign-task-name");
  const searchForm = document.querySelector<HTMLFormElement>("#assign-search-form");
  const searchFieldSelect = document.querySelector<HTMLSelectElement>("#assign-search-field");
  const searchValueInput = document.querySelector<HTMLInputElement>("#assign-search-value");
  const searchButton = document.querySelector<HTMLButtonElement>("#assign-search-btn");
  const resultsContainer = document.querySelector<HTMLDivElement>("#assign-search-results");
  const selectedUserElement = document.querySelector<HTMLDivElement>("#assign-selected-user");
  const errorElement = document.querySelector<HTMLDivElement>("#assign-task-error");
  const submitButton = document.querySelector<HTMLButtonElement>("#assign-task-submit");
  const feedbackElement = document.querySelector<HTMLDivElement>("#assign-task-feedback");

  if (
    !modalElement || !taskNameInput || !searchForm || !searchFieldSelect || !searchValueInput ||
    !searchButton || !resultsContainer || !selectedUserElement || !errorElement || !submitButton
  ) {
    console.error("Modal de atribuição de tarefa incompleto no HTML.");
    return;
  }

  let selectedUser: User | null = null;
  let isSubmitting = false;
  // Cada busca ganha um número: só a resposta da busca mais recente é exibida
  let lastSearchId = 0;

  const showError = (message: string): void => {
    errorElement.innerText = message;
    errorElement.classList.toggle("d-none", message === "");
  };

  const updateSubmitState = (): void => {
    const hasName = taskNameInput.value.trim() !== "";
    submitButton.disabled = isSubmitting || !hasName || selectedUser === null;
  };

  const renderSelectedUser = (): void => {
    selectedUserElement.classList.remove("alert-success");
    selectedUserElement.classList.add("alert-secondary");
    selectedUserElement.innerText = "Nenhum usuário escolhido.";

    if (selectedUser === null) return;

    selectedUserElement.classList.replace("alert-secondary", "alert-success");
    selectedUserElement.innerText = `Atribuir para: ${selectedUser.name} (${selectedUser.email})`;
  };

  const chooseUser = (user: User): void => {
    selectedUser = user;
    showError("");
    renderSelectedUser();
    updateSubmitState();
  };

  const resetModal = (): void => {
    lastSearchId++;
    selectedUser = null;
    taskNameInput.value = "";
    searchFieldSelect.value = "name";
    searchValueInput.value = "";
    resultsContainer.innerHTML = "";
    showError("");
    renderSelectedUser();
    updateSubmitState();
  };

  const showFeedback = (message: string): void => {
    if (!feedbackElement) return;

    feedbackElement.className = "small text-success";
    feedbackElement.innerText = message;
  };

  taskNameInput.addEventListener("input", updateSubmitState);

  // submit do form: funciona tanto no botão Buscar quanto no Enter do campo
  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const field = searchFieldSelect.value;
    const value = searchValueInput.value.trim();

    if (!isSearchField(field)) {
      userSearchMessageRender(resultsContainer, "Campo de busca inválido.", "danger");
      return;
    }

    if (value === "") {
      userSearchMessageRender(resultsContainer, "Digite um texto para buscar.", "warning");
      searchValueInput.focus();
      return;
    }

    // Ex.: cidade + "curitiba" → { city: "curitiba" }
    const filters: UserSearchFilters = { [field]: value };
    const searchId = ++lastSearchId;

    searchButton.disabled = true;
    userSearchMessageRender(resultsContainer, "Buscando...");

    try {
      const result = await userSearchApi(filters, 1, 10);

      if (searchId !== lastSearchId) return;

      userSearchResultsRender(resultsContainer, result, chooseUser);
    } catch (error) {
      console.error("Erro na busca de usuários:", error);

      if (searchId !== lastSearchId) return;

      userSearchMessageRender(resultsContainer, apiErrorMessage(error, "Erro ao buscar usuários. Tente novamente."), "danger");
    } finally {
      searchButton.disabled = false;
    }
  });

  submitButton.addEventListener("click", async () => {
    const name = taskNameInput.value.trim();

    if (name === "") {
      showError("Digite o nome da tarefa.");
      taskNameInput.focus();
      return;
    }

    if (selectedUser === null) {
      showError("Busque e escolha um usuário para atribuir a tarefa.");
      return;
    }

    const targetUser = selectedUser;

    isSubmitting = true;
    updateSubmitState();
    showError("");

    try {
      await taskCreateApi(targetUser.id, { name });
    } catch (error) {
      console.error("Erro ao criar tarefa para outro usuário:", error);
      showError(apiErrorMessage(error, "Erro ao criar a tarefa. Tente novamente."));
      isSubmitting = false;
      updateSubmitState();
      return;
    }

    isSubmitting = false;

    // Fecha pelo próprio botão Cancelar (data-bs-dismiss): o Bootstrap cuida da animação
    modalElement.querySelector<HTMLButtonElement>('[data-bs-dismiss="modal"]')?.click();
    resetModal();
    showFeedback(`Tarefa "${name}" criada para ${targetUser.name}.`);

    if (targetUser.id !== idUser) return;

    try {
      await tasksListRender(idUser);
    } catch (error) {
      console.error("Erro ao recarregar a lista de tarefas:", error);
    }
  });

  // Fechar o modal (Cancelar, X, Esc ou clique fora) descarta o que foi digitado
  modalElement.addEventListener("hidden.bs.modal", resetModal);

  modalElement.addEventListener("shown.bs.modal", () => {
    if (feedbackElement) feedbackElement.innerText = "";
    taskNameInput.focus();
  });

  resetModal();
}
