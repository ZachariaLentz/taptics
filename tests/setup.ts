// SDK 57 installs expo/fetch lazily. Resolve it while the Jest native mocks
// are alive, before Jest restores globals during environment teardown.
void globalThis.fetch;
