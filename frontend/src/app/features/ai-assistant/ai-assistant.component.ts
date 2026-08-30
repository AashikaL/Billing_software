import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Shop } from '../../core/models/models';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ai-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">🤖 AI Business Assistant</h1>
          <p class="page-subtitle">Ask questions about <strong>{{ currentShop?.shop_name }}</strong> inventory, sales, customers & profits in natural language.</p>
        </div>
      </div>

      <div class="chat-container card">
        <!-- Preset Prompt Suggestions -->
        <div class="preset-prompts">
          <span class="preset-title">💡 Suggested Questions:</span>
          <div class="prompt-chips">
            <button class="chip" (click)="askPreset('What were my best-selling products this month?')">
              🔥 Best-selling products
            </button>
            <button class="chip" (click)="askPreset('Which products are low in stock?')">
              ⚠️ Low stock items
            </button>
            <button class="chip" (click)="askPreset('How much did I sell today?')">
              💰 Today's sales
            </button>
            <button class="chip" (click)="askPreset('Which customer purchased the most?')">
              👑 Top customer
            </button>
            <button class="chip" (click)="askPreset('Show me this month revenue.')">
              📈 Monthly revenue
            </button>
            <button class="chip" (click)="askPreset('What is my total profit this month?')">
              💵 Total profit
            </button>
          </div>
        </div>

        <!-- Chat History -->
        <div class="chat-messages">
          <div *ngFor="let msg of messages" class="message-wrapper" [class.user-msg]="msg.sender === 'user'" [class.ai-msg]="msg.sender === 'ai'">
            <div class="avatar">{{ msg.sender === 'ai' ? '🤖' : '👤' }}</div>
            <div class="message-content">
              <div class="sender-name">{{ msg.sender === 'ai' ? 'AI Business Assistant' : 'You' }}</div>
              <div class="bubble" [innerHTML]="formatMessage(msg.text)"></div>
              <span class="time">{{ msg.timestamp | date:'shortTime' }}</span>
            </div>
          </div>

          <div *ngIf="isThinking" class="message-wrapper ai-msg">
            <div class="avatar">🤖</div>
            <div class="message-content">
              <div class="sender-name">AI Assistant</div>
              <div class="bubble thinking">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span> Querying shop database...
              </div>
            </div>
          </div>
        </div>

        <!-- Chat Input Form -->
        <div class="chat-input-box">
          <input
            type="text"
            class="form-control"
            placeholder="Ask anything about your shop's database..."
            [(ngModel)]="userQuestion"
            (keyup.enter)="sendQuestion()"
            [disabled]="isThinking"
          />
          <button class="btn btn-primary" (click)="sendQuestion()" [disabled]="!userQuestion.trim() || isThinking">
            Send Question
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-container { display: flex; flex-direction: column; height: Calc(100vh - 180px); min-height: 550px; padding: 1.5rem; }
    .preset-prompts { margin-bottom: 1.25rem; border-bottom: 1px solid #E2E8F0; padding-bottom: 1rem; }
    .preset-title { font-size: 0.8rem; font-weight: 700; color: #64748B; display: block; margin-bottom: 0.5rem; }
    .prompt-chips { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .chip {
      background: #EEF2FF; color: #4F46E5; border: 1px solid #C7D2FE; border-radius: 99px;
      padding: 0.35rem 0.85rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
    }
    .chip:hover { background: #4F46E5; color: white; }
    .chat-messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 1.25rem; padding-right: 0.5rem; margin-bottom: 1rem; }
    .message-wrapper { display: flex; gap: 0.85rem; max-width: 85%; }
    .message-wrapper.user-msg { align-self: flex-end; flex-direction: row-reverse; }
    .avatar {
      width: 36px; height: 36px; border-radius: 50%; background: #F1F5F9; display: flex;
      align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;
    }
    .user-msg .avatar { background: #EEF2FF; }
    .sender-name { font-size: 0.75rem; font-weight: 700; color: #64748B; margin-bottom: 0.25rem; }
    .user-msg .sender-name { text-align: right; }
    .bubble {
      padding: 0.85rem 1.1rem; border-radius: 12px; font-size: 0.9rem; line-height: 1.6;
      background: #F8FAFC; border: 1px solid #E2E8F0; color: #0F172A; white-space: pre-wrap;
    }
    .user-msg .bubble { background: #4F46E5; color: white; border-color: #4338CA; }
    .time { font-size: 0.7rem; color: #94A3B8; display: block; margin-top: 0.25rem; }
    .user-msg .time { text-align: right; }
    .chat-input-box { display: flex; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid #E2E8F0; }
    .chat-input-box input { flex: 1; }
    .thinking { color: #64748B; font-style: italic; }
    .dot {
      display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #4F46E5;
      margin-right: 4px; animation: blink 1.4s infinite inline;
    }
  `]
})
export class AiAssistantComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);

  currentShop: Shop | null = null;
  userQuestion = '';
  isThinking = false;

  messages: ChatMessage[] = [];

  ngOnInit() {
    this.authService.currentShop$.subscribe(s => this.currentShop = s);
    
    // Initial welcome message
    this.messages.push({
      sender: 'ai',
      text: `Hello! I am your AI Business Assistant. I am connected live to your **${this.currentShop?.shop_name || 'Shop'}** database. Ask me any question about your sales, products, low-stock inventory, top customers, or gross profits!`,
      timestamp: new Date()
    });
  }

  askPreset(question: string) {
    this.userQuestion = question;
    this.sendQuestion();
  }

  sendQuestion() {
    if (!this.userQuestion.trim() || this.isThinking) return;
    const q = this.userQuestion.trim();
    this.userQuestion = '';

    this.messages.push({
      sender: 'user',
      text: q,
      timestamp: new Date()
    });

    this.isThinking = true;

    this.apiService.askAi(q).subscribe({
      next: (res) => {
        this.isThinking = false;
        this.messages.push({
          sender: 'ai',
          text: res.answer,
          timestamp: new Date()
        });
      },
      error: () => {
        this.isThinking = false;
        this.messages.push({
          sender: 'ai',
          text: 'Sorry, I encountered an issue querying your database. Please try again.',
          timestamp: new Date()
        });
      }
    });
  }

  formatMessage(text: string): string {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }
}
