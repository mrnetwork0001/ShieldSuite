// ─── MCP (Model Context Protocol) Server ─────────────────────────────────────
//
// Exposes ScanGuard as an MCP-compatible tool so AI assistants (Claude, Cursor,
// GPT, etc.) can call it directly. Follows the MCP specification for tool
// discovery and invocation.
//
// MCP Endpoints:
//   GET  /mcp/tools        → List available tools
//   POST /mcp/tools/call   → Execute a tool
//

import { Router, Request, Response } from "express";
import { z } from "zod";
import { scanToken } from "./scanner.js";
import { McpToolDefinition, McpToolCallResponse } from "./types.js";
import { logger } from "./logger.js";

const mcpRouter = Router();

// ─── Tool Definitions ────────────────────────────────────────────────────────

const SCANGUARD_TOOLS: McpToolDefinition[] = [
  {
    name: "scan_token",
    description:
      "Scan an ERC-20 token contract for security risks including rug-pull indicators, honeypot detection, phishing patterns, suspicious approvals, mint functions, blacklist capabilities, and proxy/upgrade patterns. Returns a comprehensive risk score (0-100) and detailed threat flags. Designed for X Layer (Chain ID: 196) but supports any EVM chain.",
    inputSchema: {
      type: "object",
      properties: {
        tokenAddress: {
          type: "string",
          description: "The ERC-20 token contract address to scan (0x-prefixed hex string)",
          pattern: "^0x[a-fA-F0-9]{40}$",
        },
        chainId: {
          type: "number",
          description: "The chain ID to scan on. Defaults to 196 (X Layer Mainnet).",
          default: 196,
        },
      },
      required: ["tokenAddress"],
    },
  },
  {
    name: "get_risk_summary",
    description:
      "Get a human-readable risk summary for a token. Performs a scan and returns a formatted text summary suitable for displaying to users or including in agent responses.",
    inputSchema: {
      type: "object",
      properties: {
        tokenAddress: {
          type: "string",
          description: "The ERC-20 token contract address to analyze",
          pattern: "^0x[a-fA-F0-9]{40}$",
        },
      },
      required: ["tokenAddress"],
    },
  },
];

// ─── Validation ──────────────────────────────────────────────────────────────

const toolCallSchema = z.object({
  method: z.literal("tools/call"),
  params: z.object({
    name: z.string(),
    arguments: z.record(z.unknown()),
  }),
});

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /mcp/tools — List all available MCP tools
 */
mcpRouter.get("/tools", (_req: Request, res: Response) => {
  logger.info("[MCP] Tool discovery request");
  res.json({
    tools: SCANGUARD_TOOLS,
    server: {
      name: "ScanGuard",
      version: "1.0.0",
      description: "AI-powered ERC-20 token security scanner for X Layer",
    },
  });
});

/**
 * POST /mcp/tools/call — Execute an MCP tool
 */
mcpRouter.post("/tools/call", async (req: Request, res: Response) => {
  try {
    const parsed = toolCallSchema.safeParse(req.body);

    if (!parsed.success) {
      const errorResponse: McpToolCallResponse = {
        content: [
          {
            type: "text",
            text: `Invalid MCP request: ${parsed.error.message}`,
          },
        ],
        isError: true,
      };
      res.status(400).json(errorResponse);
      return;
    }

    const { name, arguments: args } = parsed.data.params;
    logger.info(`[MCP] Tool call: ${name} with args: ${JSON.stringify(args)}`);

    switch (name) {
      case "scan_token": {
        const tokenAddress = args.tokenAddress as string;
        const chainId = (args.chainId as number) || 196;

        if (!tokenAddress || !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
          const errorResponse: McpToolCallResponse = {
            content: [
              {
                type: "text",
                text: "Invalid token address. Must be a 0x-prefixed 40-character hex string.",
              },
            ],
            isError: true,
          };
          res.status(400).json(errorResponse);
          return;
        }

        const result = await scanToken({ tokenAddress, chainId });

        const response: McpToolCallResponse = {
          content: [
            {
              type: "json",
              json: result,
            },
          ],
        };
        res.json(response);
        return;
      }

      case "get_risk_summary": {
        const tokenAddress = args.tokenAddress as string;

        if (!tokenAddress || !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
          const errorResponse: McpToolCallResponse = {
            content: [
              {
                type: "text",
                text: "Invalid token address.",
              },
            ],
            isError: true,
          };
          res.status(400).json(errorResponse);
          return;
        }

        const result = await scanToken({ tokenAddress });

        // Build human-readable summary
        const riskEmoji =
          result.riskLevel === "SAFE"
            ? "✅"
            : result.riskLevel === "LOW"
            ? "🟡"
            : result.riskLevel === "MEDIUM"
            ? "🟠"
            : result.riskLevel === "HIGH"
            ? "🔴"
            : "🚨";

        let summary = `${riskEmoji} **${result.tokenName || "Unknown"} (${result.tokenSymbol || "???"})**\n`;
        summary += `Risk Score: ${result.riskScore}/100 — ${result.riskLevel}\n`;
        summary += `Contract: ${result.tokenAddress}\n`;
        summary += `Chain: X Layer (#${result.chainId})\n\n`;

        if (result.flags.length === 0) {
          summary += "No risks detected. Token appears safe for trading.\n";
        } else {
          summary += `**${result.flags.length} Risk(s) Detected:**\n`;
          result.flags.forEach((flag, i) => {
            summary += `${i + 1}. [${flag.severity}] ${flag.title}: ${flag.description}\n`;
          });
        }

        summary += `\n🔗 Explorer: ${result.xLayerExplorerUrl}`;

        const response: McpToolCallResponse = {
          content: [
            {
              type: "text",
              text: summary,
            },
          ],
        };
        res.json(response);
        return;
      }

      default: {
        const errorResponse: McpToolCallResponse = {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}. Available tools: ${SCANGUARD_TOOLS.map((t) => t.name).join(", ")}`,
            },
          ],
          isError: true,
        };
        res.status(404).json(errorResponse);
        return;
      }
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`[MCP] Tool call error: ${errorMessage}`);
    const errorResponse: McpToolCallResponse = {
      content: [
        {
          type: "text",
          text: `Internal error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
    res.status(500).json(errorResponse);
  }
});

export { mcpRouter };
