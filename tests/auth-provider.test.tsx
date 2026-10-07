import React from "react";
import renderer, { act, ReactTestRenderer } from "react-test-renderer";
import { AuthProvider, useAuthFlow } from "../lib/AuthProvider";
import { CONFIRM_REDIRECT, RECOVERY_REDIRECT } from "../lib/authCallback";
let mockInitial: string | null;
let mockLink: (event: { url: string }) => void;
type Listener = (
  event: string,
  session: { user: { id: string } } | null,
) => void;
const mockListeners = new Set<Listener>();
const mockListener: Listener = (event, session) => {
  mockListeners.forEach((listener) => listener(event, session));
};
let mockUser: string | null;
let mockIntent: string | null;
const mockExchange = jest.fn(async () => {
  mockUser = "account";
  const session = { user: { id: "account" } };
  mockListener(
    mockIntent === "recovery" ? "PASSWORD_RECOVERY" : "SIGNED_IN",
    session,
  );
  return { data: { session, redirectType: mockIntent }, error: null };
});
const mockUpdate = jest.fn(async () => ({ error: null }));
jest.mock("expo-linking", () => ({
  getInitialURL: async () => mockInitial,
  addEventListener: (_event: string, listener: typeof mockLink) => {
    mockLink = listener;
    return { remove: jest.fn() };
  },
}));
jest.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: (...args: unknown[]) =>
        mockExchange(...(args as [])),
      getSession: async () => ({
        data: { session: mockUser ? { user: { id: mockUser } } : null },
        error: null,
      }),
      updateUser: (...args: unknown[]) => mockUpdate(...(args as [])),
      onAuthStateChange: (listener: typeof mockListener) => {
        mockListeners.add(listener);
        return {
          data: {
            subscription: { unsubscribe: () => mockListeners.delete(listener) },
          },
        };
      },
    },
  },
}));
let flow!: ReturnType<typeof useAuthFlow>;
let tree: ReactTestRenderer;
function Probe() {
  const value = useAuthFlow();
  React.useEffect(() => {
    flow = value;
  });
  return null;
}
beforeEach(() => {
  mockInitial = null;
  mockUser = null;
  mockIntent = null;
  mockExchange.mockClear();
  mockUpdate.mockClear();
});
afterEach(() => {
  act(() => tree.unmount());
});
async function mount() {
  await act(async () => {
    tree = renderer.create(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
  });
}
async function link(url: string) {
  await act(async () => {
    mockLink({ url });
  });
}
test("cold confirmation and duplicate warm event exchange only once", async () => {
  mockInitial = `${CONFIRM_REDIRECT}?code=confirm`;
  await mount();
  expect(flow.status).toBe("confirmed");
  expect(flow.recoveryUserId).toBeNull();
  await link(mockInitial);
  expect(mockExchange).toHaveBeenCalledTimes(1);
});
test("warm recovery enables one password update and clears authorization afterward", async () => {
  await mount();
  mockIntent = "recovery";
  await link(`${RECOVERY_REDIRECT}?code=recover`);
  expect(flow.status).toBe("recovery");
  expect(flow.recoveryUserId).toBe("account");
  await act(async () => {
    await flow.updatePassword("new-password");
  });
  expect(mockUpdate).toHaveBeenCalledWith({ password: "new-password" });
  expect(flow.status).toBe("confirmed");
  expect(flow.recoveryUserId).toBeNull();
  await expect(flow.updatePassword("new-password")).rejects.toThrow(
    "reset email",
  );
});
test("same-account token refresh preserves recovery; switching account revokes it", async () => {
  await mount();
  mockIntent = "recovery";
  await link(`${RECOVERY_REDIRECT}?code=recover`);
  act(() => mockListener("TOKEN_REFRESHED", { user: { id: "account" } }));
  expect(flow.status).toBe("recovery");
  act(() => {
    mockUser = "other";
    mockListener("SIGNED_IN", { user: { id: "other" } });
  });
  expect(flow.recoveryUserId).toBeNull();
  await expect(flow.updatePassword("new-password")).rejects.toThrow(
    "reset email",
  );
  expect(mockUpdate).not.toHaveBeenCalled();
});
test("logout revokes recovery and rejects a delayed callback result", async () => {
  let resolve!: (value: Awaited<ReturnType<typeof mockExchange>>) => void;
  mockExchange.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  await mount();
  await link(`${RECOVERY_REDIRECT}?code=slow`);
  expect(flow.status).toBe("checking");
  act(() => {
    mockUser = null;
    mockListener("SIGNED_OUT", null);
  });
  await act(async () => {
    resolve({
      data: { session: { user: { id: "account" } }, redirectType: "recovery" },
      error: null,
    });
  });
  expect(flow.status).toBe("idle");
  expect(flow.recoveryUserId).toBeNull();
});
test("expired links and network failures show actionable errors, unrelated links do nothing", async () => {
  await mount();
  await link("taptics://score?id=completion");
  expect(flow.status).toBe("idle");
  await link(`${CONFIRM_REDIRECT}?error=expired`);
  expect(flow.status).toBe("error");
  expect(flow.message).toContain("Request a new email");
  expect(mockExchange).not.toHaveBeenCalled();
  mockExchange.mockRejectedValueOnce(new Error("Offline"));
  await link(`${CONFIRM_REDIRECT}?code=new`);
  expect(flow.status).toBe("error");
  expect(flow.message).toContain("Offline");
});

test("cold recovery restores the verified reset form and logout revokes it", async () => {
  mockInitial = `${RECOVERY_REDIRECT}?code=cold-reset`;
  mockIntent = "recovery";
  await mount();
  expect(flow.status).toBe("recovery");
  expect(flow.recoveryUserId).toBe("account");
  act(() => {
    mockUser = null;
    mockListener("SIGNED_OUT", null);
  });
  expect(flow.status).toBe("idle");
  expect(flow.recoveryUserId).toBeNull();
  await expect(flow.updatePassword("new-password")).rejects.toThrow(
    "reset email",
  );
  expect(mockUpdate).not.toHaveBeenCalled();
});
