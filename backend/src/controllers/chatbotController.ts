
import { Request, Response } from 'express';
import * as chatbotService from '../services/chatbotService';
import * as ollamaService from '../services/ollamaService';
import type { ChatMessage } from '../services/ollamaService';

// Chỉ chấp nhận hai role hợp lệ của hội thoại.
const isChatRole = (role: unknown): role is ChatMessage['role'] => {
  return role === 'user' || role === 'model';
};

export const recommend = async (req: Request, res: Response) => {
  try {
    const input = req.body as Parameters<typeof chatbotService.recommend>[0];
    const result = await chatbotService.recommend(input);
    return res.json(result);
  } catch (error: unknown) {
    console.error(
      '[Chatbot/recommend]',
      error instanceof Error ? error.message : error
    );

    return res.status(500).json({
      message: 'Có lỗi xảy ra khi đề xuất sản phẩm.',
    });
  }
};

// GET /api/chatbot/health
export const health = async (_req: Request, res: Response) => {
  const status = await ollamaService.getOllamaStatus();
  const ready = status.ok && status.modelInstalled;

  return res.status(ready ? 200 : 503).json({
    ok: ready,
    message: ready
      ? 'Trợ lý đang sẵn sàng.'
      : 'Trợ lý hiện chưa sẵn sàng.',
  });
};

// Giới hạn một lượt sinh câu trả lời đồng thời.
let activeChatRequests = 0;
const MAX_CONCURRENT_CHAT_REQUESTS = 1;

// POST /api/chatbot/message
export const chat = async (req: Request, res: Response) => {
  const message =
    typeof req.body?.message === 'string'
      ? req.body.message.trim()
      : '';

  if (!message) {
    return res.status(400).json({
      message: 'Vui lòng nhập nội dung tin nhắn.',
    });
  }

  if (message.length > 2000) {
    return res.status(400).json({
      message: 'Tin nhắn quá dài. Vui lòng giới hạn trong 2.000 ký tự.',
    });
  }

  if (activeChatRequests >= MAX_CONCURRENT_CHAT_REQUESTS) {
    return res.status(429).json({
      message: 'Trợ lý đang hỗ trợ một khách hàng khác. Bạn vui lòng thử lại sau ít phút.',
      code: 'CHATBOT_BUSY',
    });
  }

  const rawHistory = req.body?.history;

  if (rawHistory !== undefined && !Array.isArray(rawHistory)) {
    return res.status(400).json({
      message: 'Lịch sử hội thoại không hợp lệ.',
    });
  }

  // Chuẩn hóa lịch sử hội thoại và kiểm tra kiểu dữ liệu.
  const history: ChatMessage[] = (
    Array.isArray(rawHistory) ? rawHistory.slice(-8) : []
  )
    .map((item: unknown): ChatMessage | null => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const value = item as Record<string, unknown>;

      const role = value.role;
      const content = value.content;

      if (
        !isChatRole(role) ||
        typeof content !== 'string' ||
        content.length > 3000
      ) {
        return null;
      }

      const productIds = Array.isArray(value.productIds)
        ? value.productIds
            .filter(
              (id): id is string =>
                typeof id === 'string' && id.length <= 80
            )
            .slice(0, 10)
        : undefined;

      return {
        role,
        content,
        ...(productIds ? { productIds } : {}),
      };
    })
    .filter((item): item is ChatMessage => item !== null);

  activeChatRequests += 1;

  req.setTimeout(200000);
  res.setTimeout(200000);

  try {
    const result = await ollamaService.chatWithOllama({
      message,
      history,
    });

    return res.status(200).json({
      message: result.message,
      products: result.products,
      links: 'links' in result ? result.links : [],
    });
  } catch (error) {
    if (error instanceof ollamaService.OllamaServiceError) {
      return res.status(error.statusCode).json({
        message: error.message,
        code: error.code,
      });
    }

    console.error(
      '[Chatbot/controller]',
      error instanceof Error ? error.message : 'unknown error'
    );

    return res.status(500).json({
      message: 'Xin lỗi, hiện tại trợ lý chưa thể phản hồi. Bạn vui lòng thử lại sau ít phút hoặc liên hệ cửa hàng để được hỗ trợ nhé.',
      code: 'CHATBOT_INTERNAL_ERROR',
    });
  } finally {
    activeChatRequests -= 1;
  }
};
