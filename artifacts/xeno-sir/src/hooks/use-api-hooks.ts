import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthHeaders, getAuthToken, clearAuth } from "@/lib/utils";
import {
  useGetMe,
  useLogin,
  useListLectures,
  useCreateLecture,
  useUpdateLecture,
  useDeleteLecture,
  useListStudents,
  useCreateStudent,
  useDeleteStudent,
  useGetStudent,
  useListOpenaiConversations,
  useGetOpenaiConversation,
  useDeleteOpenaiConversation,
  useGenerateExam,
  useGetChatHistory
} from "@workspace/api-client-react";

// Auth interceptor wrapper for Orval hooks
const withAuth = () => ({
  request: {
    headers: getAuthHeaders()
  }
});

export function useAuth() {
  const token = getAuthToken();
  const queryClient = useQueryClient();

  const meQuery = useGetMe({
    ...withAuth(),
    query: {
      enabled: !!token,
      retry: false,
    }
  });

  const loginMutation = useLogin();

  const logout = () => {
    clearAuth();
    queryClient.clear();
    window.location.href = "/login";
  };

  return {
    user: meQuery.data,
    isLoading: meQuery.isLoading,
    isError: meQuery.isError,
    login: loginMutation.mutateAsync,
    logout,
    isAuthenticated: !!token && !!meQuery.data,
  };
}

export function useLectures() {
  return useListLectures({ ...withAuth() });
}

export function useManageLectures() {
  const queryClient = useQueryClient();
  
  const create = useCreateLecture({
    ...withAuth(),
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/lectures"] })
    }
  });

  const update = useUpdateLecture({
    ...withAuth(),
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/lectures"] })
    }
  });

  const remove = useDeleteLecture({
    ...withAuth(),
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/lectures"] })
    }
  });

  return { create, update, remove };
}

export function useStudents() {
  return useListStudents({ ...withAuth() });
}

export function useStudentDetails(id: number) {
  return useGetStudent(id, {
    ...withAuth(),
    query: { enabled: !!id }
  });
}

export function useManageStudents() {
  const queryClient = useQueryClient();
  
  const create = useCreateStudent({
    ...withAuth(),
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/students"] })
    }
  });

  const remove = useDeleteStudent({
    ...withAuth(),
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/students"] })
    }
  });

  return { create, remove };
}

export function useConversations() {
  return useListOpenaiConversations({ ...withAuth() });
}

export function useConversation(id?: number) {
  return useGetOpenaiConversation(id!, {
    ...withAuth(),
    query: { enabled: !!id }
  });
}

export function useManageConversations() {
  const queryClient = useQueryClient();
  
  const remove = useDeleteOpenaiConversation({
    ...withAuth(),
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/openai/conversations"] })
    }
  });

  return { remove };
}

export function useExamGenerator() {
  return useGenerateExam({ ...withAuth() });
}

export function useStudentChatHistory(studentId: number) {
  return useGetChatHistory(studentId, {
    ...withAuth(),
    query: { enabled: !!studentId }
  });
}
