import { env } from '../config/env';
import axios from 'axios';
import { prisma } from '../config/db';

export type ChatMessage = {
  role: 'user' | 'model';
  content: string;
};

export type ChatInput = {
  message: string;
  history?: ChatMessage[];
};

type OllamaResponse = {
  message?: {
    content?: string;
  };
};

type ProductItem = {
  id: string;
  name: string;
  price: number;
  brand: string | null;
};

const formatPrice = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

/**
 * Trả lời câu hỏi tư vấn bằng Local AI (Ollama - model cấu hình trong OLLAMA_MODEL, mặc định gemma3:1b)
 */
export const chatWithGemini = async ({ message, history = [] }: ChatInput) => {
  try {
    // 1. Lấy 5 sản phẩm tiêu biểu để prompt gọn nhẹ nhất
    const products: ProductItem[] = await prisma.product.findMany({
      where: { isActive: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        price: true,
        brand: true,
      },
    });

    const productContext = products
      .map((p: ProductItem) => `- [${p.id}] ${p.name} (${p.brand || 'Khác'}): ${formatPrice(p.price)}`)
      .join('\n');

    const systemInstructionText = `Bạn là Trợ lý AI Cửa Hàng Máy Tính.
Sản phẩm gợi ý:
${productContext}
Quy tắc: Trả lời thân thiện bằng tiếng Việt, ngắn gọn (tối đa 3 câu), tư vấn đúng sản phẩm trên.`;

    const messagesPayload = [
      { role: 'system', content: systemInstructionText },
      ...history.slice(-4).map((h) => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.content,
      })),
      { role: 'user', content: message },
    ];

    // 2. Gọi Ollama API với IP 127.0.0.1, timeout 120s và giới hạn token
    const response = await axios.post<OllamaResponse>(
      `${env.ollama.baseUrl}/api/chat`,
      {
        model: env.ollama.model,
        messages: messagesPayload,
        stream: false,
        options: {
          num_predict: 150, // Giới hạn phản hồi ngắn để đạt tốc độ tối đa
          temperature: 0.6,
        },
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000,
      }
    );

    const replyText = response.data?.message?.content || '';

    if (!replyText) {
      throw new Error('Ollama chưa trả về văn bản');
    }

    // 3. Lọc sản phẩm gợi ý
    const matchedProducts = products
      .filter((p: ProductItem) => replyText.toLowerCase().includes(p.name.toLowerCase()) || replyText.includes(p.id))
      .slice(0, 4);

    return {
      message: replyText,
      products: matchedProducts.map((p: ProductItem) => ({ ...p, _id: p.id })),
      hasApiKey: true,
    };
  } catch (error: any) {
    console.error('=== CHI TIẾT LỖI OLLAMA LOCAL ===:', error?.message || error);

    return {
      message: 'Xin lỗi bạn, kết nối đến máy chủ AI đang bận. Bạn vui lòng thử lại sau ít giây nhé!',
      products: [],
      error: error?.message,
      hasApiKey: true,
    };
  }
};