# RUI Web uses an ACP adapter boundary

RUI Web will be implemented as an independent React/Vite web client under `ui/web`, with Goose's ACP details isolated in an ACP adapter and RUI-specific behavior kept in a product layer. This preserves the option to reuse the same product experience with a remote service or a Tauri/Electron shell without coupling the interface directly to Goose transport types.

## Considered Options

- Directly bind the Web UI to ACP types for faster initial development.
- Reuse the Electron desktop implementation as the Web implementation.
- Use an ACP adapter and a separate product layer.

The adapter boundary was selected because the first phase must match the official desktop capability baseline while keeping future transport, packaging, and product changes reversible.
