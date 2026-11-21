# Peyk Signal

**Since 2026** · [signal.getpeyk.com](https://signal.getpeyk.com)

An attention filter for social media. Signal watches connected accounts, classifies every
incoming message with Claude, scores it from 0 to 10, and sends a Telegram alert only when
something needs a person; the rest waits in a review queue or is archived. Rules can overrule
the model: messages from VIP accounts or with keywords such as "refund" always alert, and the
team's own messages never do. Multi-tenant: every workspace sees only its own data.

In use at Global Underwater Explorers and Halcyon Dive Systems, and for Dipnot and my own
accounts; a SaaS version for other teams is planned.

|          |                                                                      |
| -------- | -------------------------------------------------------------------- |
| Back end | Python and FastAPI, on Google Cloud Run                              |
| AI       | Claude API                                                           |
| Data     | Firestore, with connected-account credentials encrypted by Cloud KMS |
| Alerts   | Telegram Bot API                                                     |

[Peyk](https://getpeyk.com) is a name I share with a friend: two independent products for the
two channels of company communication. Signal, for social media, is mine; Inbox, for email, is
theirs.

Built for GUE: [experience/diving/2022-gue](../experience/diving/2022-gue.md).
