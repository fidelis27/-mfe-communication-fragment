import { act, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import type { DomainEvent } from "@mfe/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ActivityApp from "../../mfe-activity/src/App";
import DashboardApp from "../../mfe-dashboard/src/App";

const authMocks = vi.hoisted(() => ({
  initializeAuth: vi.fn(),
  subscribeToAuthState: vi.fn(),
  useDomainEvents: vi.fn(() => ({ events: [], connection: "connected" as const })),
}));

vi.mock("@mfe/shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@mfe/shared")>()),
  ...authMocks,
}));
vi.mock("@lib-core-mfe/fragment-frontend/consumer", () => ({ FragmentSlot: () => null }));

describe("domain event delivery across MFEs", () => {
  const fetchMock = vi.fn();
  // Calls to the backend API only; the Host also asks its server for the remote fragment.
  const apiCalls = () =>
    fetchMock.mock.calls.filter(([url]) => !String(url).startsWith("/api/fragments"));

  beforeEach(() => {
    Reflect.deleteProperty(globalThis, "__mfeBus");
    Reflect.set(globalThis, "__mfeHostReady", true);
    fetchMock.mockReset();
    fetchMock.mockImplementation((url: unknown) =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            String(url).startsWith("/api/fragments")
              ? {
                  fragment: { id: "f1", name: "student", appName: "mfe-student", script: "" },
                  html: "",
                }
              : [],
          ),
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "public-key");
    authMocks.initializeAuth.mockResolvedValue(true);
    authMocks.subscribeToAuthState.mockReturnValue(() => {});
    authMocks.useDomainEvents.mockReturnValue({ events: [], connection: "connected" });
    window.history.pushState({}, "", "/estudantes");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(globalThis, "__mfeHostReady");
    Reflect.deleteProperty(globalThis, "__mfeBus");
  });

  it("refreshes Dashboard once and adds one Activity row for one student event", async () => {
    const { default: HostApp } = await import("./App");
    const dashboardQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const activityQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const appTree = () => (
      <StrictMode>
        <HostApp />
        <QueryClientProvider client={dashboardQueryClient}>
          <DashboardApp />
        </QueryClientProvider>
        <QueryClientProvider client={activityQueryClient}>
          <ActivityApp />
        </QueryClientProvider>
      </StrictMode>
    );
    const { rerender } = render(appTree());

    await waitFor(() => {
      expect(screen.getByText("Dados em movimento")).toBeInTheDocument();
      expect(screen.getByText("Aguardando uma alteração no sistema.")).toBeInTheDocument();
      expect(apiCalls()).toHaveLength(8);
    });
    fetchMock.mockClear();

    act(() => {
      authMocks.useDomainEvents.mockReturnValue({
        events: [
          {
            eventId: "event-1",
            type: "STUDENT_CREATED",
            version: 1,
            source: "test",
            correlationId: "test",
            occurredAt: "2026-01-01T00:00:00.000Z",
            payload: {
              id: "student-1",
              name: "Ana Souza",
              institutionId: "institution-1",
              status: "active",
            },
          } satisfies DomainEvent<"STUDENT_CREATED">,
        ],
        connection: "connected",
      });
      rerender(appTree());
    });

    await waitFor(() => expect(apiCalls()).toHaveLength(3));
    const activityFeed = screen.getByText("Eventos recentes").closest("section");
    if (!activityFeed) throw new Error("Activity feed was not rendered");
    expect(within(activityFeed).getAllByRole("article")).toHaveLength(1);
    expect(within(activityFeed).getByText("Estudante cadastrado")).toBeInTheDocument();
  });
});
