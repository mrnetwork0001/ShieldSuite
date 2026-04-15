# Keyword Glossary — okx-dex-trenches

| Chinese | English / Platform Terms | Maps To |
|---|---|---|
| 扫链 | trenches, memerush, 战壕, 打狗 | `onchainos memepump tokens` |
| 同车 | aped, same-car, co-invested | `onchainos memepump aped-wallet` |
| 开发者信息 | dev info, developer reputation, rug check | `onchainos memepump token-dev-info` |
| 捆绑/狙击 | bundler, sniper, bundle analysis | `onchainos memepump token-bundle-info` |
| 持仓分析 | holding analysis (meme context) | `onchainos memepump token-details` (tags fields) |
| 社媒筛选 | social filter | `onchainos memepump tokens --has-x`, `--has-telegram`, etc. |
| 新盘 / 迁移中 / 已迁移 | NEW / MIGRATING / MIGRATED | `onchainos memepump tokens --stage` |
| pumpfun / bonkers / bonk / believe / bags / mayhem | protocol names (launch platforms) | `onchainos memepump tokens --protocol-id-list <id>` |

> **Note: Protocol names are NOT token names.** When a user mentions pumpfun, bonkers, bonk, believe, bags, mayhem, fourmeme, etc., look up their IDs via `onchainos memepump chains`, then pass to `--protocol-id-list`. Multiple protocols: comma-separate the IDs. The table below is a reference only — use it as a fallback if the command is unavailable.

## Protocol ID Reference

| Chain | Protocol Name | Protocol ID |
|---|---|---|
| Solana | pumpfun | `120596` |
| Solana | bonk | `136266` |
| Solana | bonkers | `139661` |
| Solana | jupStudio | `137346` |
| Solana | believe | `134788` |
| Solana | bags | `129813` |
| Solana | moonshotMoney | `133933` |
| Solana | launchlab | `136137` |
| Solana | moonshot | `121201` |
| Solana | meteoradbc | `136460` |
| Solana | mayhem | `139048` |
| BNB Chain | fourmeme | `135086` |
| BNB Chain | flap | `129826` |
| Base | clanker | `130981` |
| Base | bankr | `134522` |
| XLayer | dyorfun | `137823` |
| XLayer | flap | `129826` |
| TRON | sunpump | `121263` |

> **Disclaimer**: This list is not exhaustive and may be updated from time to time as new platforms launch. Always run `onchainos memepump chains` for the latest full list.

