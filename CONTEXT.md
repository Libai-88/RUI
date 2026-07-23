# RUI Web

RUI Web is a Windows-focused browser client for Goose, providing a branded local web workspace while preserving Goose's agent capabilities and leaving room for future desktop packaging.

## Product language

**RUI**:
The branded product experience built on top of Goose. RUI includes its own product-facing interface while Goose remains the agent backend.
_Avoid_: Goose Web, RUI Goose

**RUI Web**:
The browser-based RUI client used during the first delivery phase.
_Avoid_: Desktop app, browser extension

**ACP adapter**:
The boundary that translates between Goose's Agent Client Protocol and RUI's product-facing session, message, tool, permission, and connection models.
_Avoid_: ACP UI, protocol state

**Product layer**:
The RUI-facing application model and interface that remains independent from ACP transport details.
_Avoid_: frontend shell, view layer

**Goose service**:
The local Goose process exposed through `goose serve`, responsible for agent execution, sessions, providers, extensions, and permissions.
_Avoid_: API server, RUI backend

**Workspace**:
The local project directory supplied when a Goose session is created and used as the operating context for agent tools.
_Avoid_: project, working folder

**Session**:
A Goose-managed conversation that can be created, loaded, resumed, and switched from RUI.
_Avoid_: chat, conversation window

**Tool invocation**:
An agent-requested execution of a Goose or MCP tool, displayed separately from assistant text and tool results.
_Avoid_: tool message, action

**Permission request**:
A Goose ACP request asking the user to approve or reject a sensitive tool invocation.
_Avoid_: authorization dialog, access prompt

**Connection state**:
The RUI model describing its relationship with the Goose service, including disconnected, connecting, connected, authentication failed, service unavailable, protocol error, and processing states.
_Avoid_: WebSocket state, server status

**Provider configuration**:
The Goose-controlled selection and configuration of the AI provider and model used by a session; RUI displays a summary and does not hard-code a vendor in the first phase.
_Avoid_: model backend, AI integration
