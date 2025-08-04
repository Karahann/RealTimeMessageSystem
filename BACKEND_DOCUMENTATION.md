# Real-Time Messaging System - Backend Dokümantasyonu

## 📋 İçindekiler

1. [Proje Genel Bakış](#proje-genel-bakış)
2. [Teknoloji Yığını](#teknoloji-yığını)
3. [Sistem Mimarisi](#sistem-mimarisi)
4. [API Endpoint'leri](#api-endpointleri)
5. [Authentication Sistemi](#authentication-sistemi)
6. [Socket.IO Real-Time İletişim](#socketio-real-time-iletişim)
7. [Otomatik Mesajlaşma Sistemi](#otomatik-mesajlaşma-sistemi)
8. [Database Modelleri](#database-modelleri)
9. [Error Handling ve Monitoring](#error-handling-ve-monitoring)
10. [Kurulum ve Çalıştırma](#kurulum-ve-çalıştırma)
11. [Frontend Integration Örnekleri](#frontend-integration-örnekleri)
12. [Güvenlik Özellikleri](#güvenlik-özellikleri)
13. [Performance ve Optimizasyon](#performance-ve-optimizasyon)

---

## 🎯 Proje Genel Bakış

Real-Time Messaging System, kullanıcıların birbiriyle gerçek zamanlı mesajlaşabileceği, enterprise düzeyinde bir backend sistemidir. Sistem mikroservis mimarisi prensiplerine göre tasarlanmış olup, scalability, security ve maintainability odaklı geliştirilmiştir.

### Temel Özellikler

- **Real-Time Mesajlaşma**: Socket.IO ile anlık mesaj gönderimi
- **JWT Authentication**: Güvenli kullanıcı yetkilendirmesi
- **Otomatik Mesajlaşma**: Cron job + RabbitMQ ile zamanlanmış mesajlar
- **Online User Tracking**: Redis ile gerçek zamanlı kullanıcı takibi
- **Professional Monitoring**: Sentry error tracking + Winston logging
- **API Documentation**: Swagger/OpenAPI 3.0

---

## 🛠️ Teknoloji Yığını

### Core Technologies

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Cache**: Redis
- **Message Queue**: RabbitMQ
- **Real-Time**: Socket.IO

### Security & Validation

- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Input Validation**: Zod
- **Security Headers**: Helmet
- **Rate Limiting**: express-rate-limit

### Monitoring & Logging

- **Error Tracking**: Sentry
- **Logging**: Winston
- **API Docs**: Swagger (swagger-jsdoc + swagger-ui-express)

### DevOps & Utilities

- **Task Scheduling**: node-cron
- **Environment**: dotenv
- **Utilities**: lodash
- **Containerization**: Docker Compose

---

## 🏗️ Sistem Mimarisi

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Load Balancer │    │   Nginx Proxy   │
│   (React/Vue)   │◄──►│   (Optional)    │◄──►│   (Optional)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                              │
         ▼                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express.js Server                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │   REST API  │ │ Socket.IO   │ │ Middleware  │               │
│  │ Endpoints   │ │ Real-Time   │ │ (Auth,Rate) │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  MongoDB    │    │   Redis     │    │  RabbitMQ   │
│ (Database)  │    │  (Cache)    │    │ (Queue)     │
└─────────────┘    └─────────────┘    └─────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User      │    │   Online    │    │ Automatic   │
│ Messages    │    │   Users     │    │ Messages    │
│Conversations│    │  Sessions   │    │   Queue     │
└─────────────┘    └─────────────┘    └─────────────┘
```

### Sistem Akışı

1. **Authentication Flow**: JWT tabanlı login/register
2. **Real-Time Communication**: Socket.IO ile instant messaging
3. **Data Persistence**: MongoDB ile mesaj/user storage
4. **Caching Layer**: Redis ile session ve online user management
5. **Background Jobs**: RabbitMQ + Cron ile otomatik mesajlaşma
6. **Monitoring**: Sentry ile error tracking, Winston ile logging

---

## 🔌 API Endpoint'leri

### Base URL

```
http://localhost:3000/api
```

### Authentication Endpoints

#### 1. Kullanıcı Kaydı

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "username": "john_doe",
      "email": "john@example.com",
      "isActive": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

#### 2. Kullanıcı Girişi

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### 3. Token Yenileme

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### 4. Profil Bilgileri

```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

#### 5. Profil Güncelleme

```http
PUT /api/auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "username": "new_username",
  "email": "new@example.com",
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

#### 6. Güvenli Çıkış

```http
POST /api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### User Management Endpoints

#### 1. Kullanıcı Listesi

```http
GET /api/users/list
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

#### 2. Online Kullanıcı Sayısı

```http
GET /api/users/online/count
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response:**

```json
{
  "success": true,
  "data": {
    "onlineUserCount": 5,
    "timestamp": "2025-01-01T12:00:00.000Z"
  }
}
```

#### 3. Kullanıcı Online Durumu

```http
GET /api/users/online/status/:userId
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

#### 4. Online Kullanıcı Listesi

```http
GET /api/users/online/list
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Conversation Endpoints

#### 1. Konuşma Listesi

```http
GET /api/conversations
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

#### 2. Konuşma Oluşturma/Getirme

```http
POST /api/conversations
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "participantId": "64f8a1b2c3d4e5f6a7b8c9d1"
}
```

### Message Endpoints

#### 1. Mesaj Geçmişi

```http
GET /api/messages/conversations/:conversationId?page=1&limit=50
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

#### 2. Mesaj Gönderme

```http
POST /api/messages
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "conversationId": "64f8a1b2c3d4e5f6a7b8c9d2",
  "content": "Hello, how are you?"
}
```

### Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "OK",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

---

## 🔐 Authentication Sistemi

### JWT Token Yapısı

#### Access Token

- **Expire Time**: 15 dakika
- **Payload**:

```json
{
  "userId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "email": "john@example.com",
  "username": "john_doe",
  "iat": 1640995200,
  "exp": 1640996100
}
```

#### Refresh Token

- **Expire Time**: 7 gün
- **Single Use**: Kullanıldığında yeni token çifti oluşturulur

### Token Usage

#### Header Format

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Frontend Token Management

```javascript
// Store tokens
localStorage.setItem("accessToken", response.data.tokens.accessToken);
localStorage.setItem("refreshToken", response.data.tokens.refreshToken);

// Auto-refresh logic
const refreshToken = async () => {
  const refreshToken = localStorage.getItem("refreshToken");
  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (response.ok) {
    const data = await response.json();
    localStorage.setItem("accessToken", data.data.tokens.accessToken);
    localStorage.setItem("refreshToken", data.data.tokens.refreshToken);
  }
};
```

### Token Blacklisting

Logout işleminde token'lar Redis'te blacklist'e eklenir:

- **Key Pattern**: `blacklist:{token}`
- **TTL**: Token'ın kalan süresine eşit
- **Purpose**: Güvenli çıkış garantisi

---

## 🔄 Socket.IO Real-Time İletişim

### Connection Setup

#### Client Connection

```javascript
import io from "socket.io-client";

const socket = io("http://localhost:3000", {
  auth: {
    token: localStorage.getItem("accessToken"),
  },
});
```

### Event'ler

#### 1. Connection Events

**Server → Client: User Online**

```javascript
socket.on("user_online", (data) => {
  console.log("User came online:", data);
  // { userId, username, timestamp }
});
```

**Server → Client: User Offline**

```javascript
socket.on("user_offline", (data) => {
  console.log("User went offline:", data);
  // { userId, username, timestamp }
});
```

#### 2. Room Management

**Client → Server: Join Room**

```javascript
socket.emit("join_room", {
  conversationId: "64f8a1b2c3d4e5f6a7b8c9d2",
});
```

**Server → Client: Joined Room**

```javascript
socket.on("joined_room", (data) => {
  console.log("Joined conversation:", data.conversationId);
});
```

#### 3. Messaging

**Client → Server: Send Message**

```javascript
socket.emit("send_message", {
  conversationId: "64f8a1b2c3d4e5f6a7b8c9d2",
  content: "Hello, real-time message!",
});
```

**Server → Client: Message Received**

```javascript
socket.on("message_received", (data) => {
  console.log("New message:", data);
  // {
  //   message: { id, content, senderId, conversationId, createdAt },
  //   timestamp: "2025-01-01T12:00:00.000Z"
  // }
});
```

#### 4. Typing Indicators

**Client → Server: Typing Start**

```javascript
socket.emit("typing_start", {
  conversationId: "64f8a1b2c3d4e5f6a7b8c9d2",
});
```

**Client → Server: Typing Stop**

```javascript
socket.emit("typing_stop", {
  conversationId: "64f8a1b2c3d4e5f6a7b8c9d2",
});
```

**Server → Client: User Typing**

```javascript
socket.on("user_typing", (data) => {
  console.log("User is typing:", data);
  // { userId, username, conversationId }
});

socket.on("user_stopped_typing", (data) => {
  console.log("User stopped typing:", data);
  // { userId, conversationId }
});
```

### Error Handling

```javascript
socket.on("error", (error) => {
  console.error("Socket error:", error);
  // Handle connection errors
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
  // Handle disconnection
});
```

### Frontend Real-Time Implementation

```javascript
class MessageSocket {
  constructor(token) {
    this.socket = io("http://localhost:3000", {
      auth: { token },
    });
    this.setupEventListeners();
  }

  setupEventListeners() {
    // User status updates
    this.socket.on("user_online", this.handleUserOnline);
    this.socket.on("user_offline", this.handleUserOffline);

    // Message events
    this.socket.on("message_received", this.handleNewMessage);

    // Typing indicators
    this.socket.on("user_typing", this.handleUserTyping);
    this.socket.on("user_stopped_typing", this.handleUserStoppedTyping);
  }

  joinConversation(conversationId) {
    this.socket.emit("join_room", { conversationId });
  }

  sendMessage(conversationId, content) {
    this.socket.emit("send_message", { conversationId, content });
  }

  startTyping(conversationId) {
    this.socket.emit("typing_start", { conversationId });
  }

  stopTyping(conversationId) {
    this.socket.emit("typing_stop", { conversationId });
  }
}
```

---

## ⚙️ Otomatik Mesajlaşma Sistemi

### 3 Aşamalı Sistem Mimarisi

#### 1. Mesaj Planlama (Gece 02:00)

**Dosya**: `src/jobs/message-scheduler.ts`

**İşlem Süreci**:

1. Aktif kullanıcıları çek (`User.find({ isActive: true })`)
2. Fisher-Yates algoritması ile karıştır
3. İkişerli gruplara ayır (gönderici/alıcı)
4. Rastgele mesaj içeriği oluştur (10 mesaj havuzu)
5. Gelecek tarih belirle (0-24 saat arası)
6. `AutoMessage` koleksiyonuna kaydet

```javascript
// Cron schedule
cron.schedule("0 2 * * *", async () => {
  console.log("Starting automatic message scheduling...");

  const users = await User.find({ isActive: true });
  const shuffledUsers = shuffleArray(users);

  const autoMessages = [];
  for (let i = 0; i < shuffledUsers.length - 1; i += 2) {
    const sender = shuffledUsers[i];
    const receiver = shuffledUsers[i + 1];

    const sendDate = new Date();
    sendDate.setHours(sendDate.getHours() + Math.floor(Math.random() * 24));

    autoMessages.push({
      senderId: sender._id,
      receiverId: receiver._id,
      content: generateRandomMessage(),
      sendDate,
      isQueued: false,
      isSent: false,
    });
  }

  await AutoMessage.insertMany(autoMessages);
});
```

#### 2. Kuyruk Yönetimi (Her Dakika)

**Dosya**: `src/jobs/queue-manager.ts`

**İşlem Süreci**:

1. Gönderim zamanı gelen mesajları bul
2. RabbitMQ'ya gönder
3. `isQueued: true` olarak işaretle

```javascript
cron.schedule("*/1 * * * *", async () => {
  const now = new Date();

  const pendingMessages = await AutoMessage.find({
    sendDate: { $lte: now },
    isQueued: false,
    isSent: false,
  }).populate("senderId receiverId");

  for (const message of pendingMessages) {
    await RabbitMQService.publishMessage({
      autoMessageId: message._id.toString(),
      senderId: message.senderId._id.toString(),
      receiverId: message.receiverId._id.toString(),
      content: message.content,
    });

    message.isQueued = true;
    message.queuedAt = new Date();
    await message.save();
  }
});
```

#### 3. Mesaj Dağıtım (RabbitMQ Consumer)

**Dosya**: `src/listeners/message-consumer.ts`

**İşlem Süreci**:

1. RabbitMQ queue'unu dinle
2. Mesajı veritabanına kaydet
3. Socket.IO ile alıcıya gönder
4. `isSent: true` olarak işaretle

```javascript
await RabbitMQService.consumeMessages(async (messageData) => {
  // 1. Create message in database
  const newMessage = await MessageService.createMessage(
    messageData.conversationId,
    messageData.senderId,
    messageData.content,
    "automatic"
  );

  // 2. Send via Socket.IO
  io.to(messageData.receiverId).emit("message_received", {
    message: newMessage,
    timestamp: new Date(),
    isAutomatic: true,
  });

  // 3. Mark as sent
  await AutoMessage.findByIdAndUpdate(messageData.autoMessageId, {
    isSent: true,
    sentAt: new Date(),
  });
});
```

### Consumer Başlatma

```bash
# Separate terminal window
npm run consumer
```

---

## 💾 Database Modelleri

### User Model

```javascript
{
  _id: ObjectId,
  username: String (unique, indexed),
  email: String (unique, indexed),
  password: String (hashed),
  isActive: Boolean (indexed),
  lastSeen: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Conversation Model

```javascript
{
  _id: ObjectId,
  participants: [ObjectId] (indexed),
  lastMessage: ObjectId,
  lastMessageAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Message Model

```javascript
{
  _id: ObjectId,
  conversationId: ObjectId (indexed),
  senderId: ObjectId (indexed),
  content: String (maxlength: 1000),
  messageType: String (enum: ["text", "auto"]),
  isRead: Boolean,
  readAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### AutoMessage Model

```javascript
{
  _id: ObjectId,
  senderId: ObjectId (indexed),
  receiverId: ObjectId (indexed),
  content: String,
  sendDate: Date (indexed),
  isQueued: Boolean (indexed),
  isSent: Boolean (indexed),
  queuedAt: Date,
  sentAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚨 Error Handling ve Monitoring

### Sentry Error Tracking

#### Otomatik Error Capture

- **API Errors**: Tüm Express route hataları
- **Socket.IO Errors**: WebSocket bağlantı hataları
- **Database Errors**: MongoDB ve Redis hataları
- **Async Errors**: Promise rejection'ları

#### Manual Error Capture

```javascript
import { captureError, captureMessage } from './config/sentry';

try {
  // Risky operation
} catch (error) {
  captureError(error, {
    context: 'user_operation',
    userId: userId,
    additionalData: {...}
  });
}

// Important events
captureMessage('User completed registration', 'info');
```

#### User Context Tracking

```javascript
// Automatic user context in API requests
req.user = { userId, email, username };
// Sentry automatically captures this context

// Socket.IO user context
setUser({ id: userId, username });
```

### Winston Logging

#### Log Levels

- **error**: System errors, exceptions
- **warn**: Warning messages
- **info**: General information
- **debug**: Debug information (development)

#### Log Format

```json
{
  "level": "info",
  "message": "User logged in successfully",
  "service": "realtime-messaging",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "userId": "64f8a1b2c3d4e5f6a7b8c9d0"
}
```

#### Log Files

- **logs/error.log**: Error level logs
- **logs/combined.log**: All levels
- **Console**: Development environment

---

## 🚀 Kurulum ve Çalıştırma

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Git

### 1. Repository Clone

```bash
git clone <repository-url>
cd RealTimeMessageSystem
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configurations
```

### 3. Docker Services

```bash
# Start MongoDB, Redis, RabbitMQ
docker-compose up -d

# Verify services
docker-compose ps
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Start Development Server

```bash
# Terminal 1: Main server
npm run dev

# Terminal 2: Message consumer (optional)
npm run consumer
```

### 6. Verify Installation

```bash
# Health check
curl http://localhost:3000/health

# API documentation
open http://localhost:3000/api-docs
```

### Environment Variables

#### Required Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/realtime-messaging

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_RELEASE=realtime-messaging@1.0.0
```

---

## 💻 Frontend Integration Örnekleri

### React Hooks Integration

#### useAuth Hook

```javascript
import { useState, useEffect } from "react";

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("accessToken"));

  const login = async (email, password) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      setToken(data.data.tokens.accessToken);
      setUser(data.data.user);
      localStorage.setItem("accessToken", data.data.tokens.accessToken);
      localStorage.setItem("refreshToken", data.data.tokens.refreshToken);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    setToken(null);
    setUser(null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  };

  return { user, token, login, logout };
};
```

#### useSocket Hook

```javascript
import { useEffect, useState } from "react";
import io from "socket.io-client";

const useSocket = (token) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (token) {
      const newSocket = io("http://localhost:3000", {
        auth: { token },
      });

      newSocket.on("user_online", (data) => {
        setOnlineUsers((prev) => [...prev, data.userId]);
      });

      newSocket.on("user_offline", (data) => {
        setOnlineUsers((prev) => prev.filter((id) => id !== data.userId));
      });

      setSocket(newSocket);

      return () => newSocket.close();
    }
  }, [token]);

  return { socket, onlineUsers };
};
```

#### useMessages Hook

```javascript
const useMessages = (conversationId, socket) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (conversationId) {
      loadMessages();

      if (socket) {
        socket.emit("join_room", { conversationId });
        socket.on("message_received", handleNewMessage);

        return () => {
          socket.off("message_received", handleNewMessage);
        };
      }
    }
  }, [conversationId, socket]);

  const loadMessages = async () => {
    setLoading(true);
    const response = await fetch(
      `/api/messages/conversations/${conversationId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (response.ok) {
      const data = await response.json();
      setMessages(data.data.messages);
    }
    setLoading(false);
  };

  const handleNewMessage = (data) => {
    setMessages((prev) => [...prev, data.message]);
  };

  const sendMessage = (content) => {
    if (socket && content.trim()) {
      socket.emit("send_message", { conversationId, content });
    }
  };

  return { messages, loading, sendMessage };
};
```

### Vue.js Composition API Integration

```javascript
import { ref, onMounted, onUnmounted } from "vue";
import io from "socket.io-client";

export function useMessaging(token) {
  const socket = ref(null);
  const messages = ref([]);
  const onlineUsers = ref([]);

  const connectSocket = () => {
    socket.value = io("http://localhost:3000", {
      auth: { token: token.value },
    });

    socket.value.on("message_received", (data) => {
      messages.value.push(data.message);
    });

    socket.value.on("user_online", (data) => {
      onlineUsers.value.push(data.userId);
    });

    socket.value.on("user_offline", (data) => {
      onlineUsers.value = onlineUsers.value.filter((id) => id !== data.userId);
    });
  };

  const sendMessage = (conversationId, content) => {
    if (socket.value) {
      socket.value.emit("send_message", { conversationId, content });
    }
  };

  onMounted(() => {
    if (token.value) {
      connectSocket();
    }
  });

  onUnmounted(() => {
    if (socket.value) {
      socket.value.disconnect();
    }
  });

  return {
    socket,
    messages,
    onlineUsers,
    sendMessage,
  };
}
```

---

## 🔒 Güvenlik Özellikleri

### Rate Limiting

- **Window**: 15 dakika
- **Limit**: 100 request per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

### Input Validation (Zod)

```javascript
// Registration validation
const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email().toLowerCase(),
  password: z.string().min(6),
});
```

### Security Headers (Helmet)

- **Content Security Policy**
- **XSS Protection**
- **Frame Options**
- **HSTS** (Production)
- **No Sniff**

### CORS Configuration

```javascript
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
```

### Password Security

- **Algorithm**: bcrypt
- **Salt Rounds**: 12
- **Hashing**: Pre-save middleware

---

## ⚡ Performance ve Optimizasyon

### Database Indexing

- **User**: username, email, isActive
- **Message**: conversationId, senderId
- **AutoMessage**: senderId, receiverId, sendDate, isQueued, isSent
- **Conversation**: participants

### Redis Caching

- **Online Users**: Set data structure
- **Token Blacklist**: TTL-based expiration
- **Session Management**: User context caching

### MongoDB Optimization

- **Lean Queries**: `.lean()` for read-only operations
- **Pagination**: Limit + skip for large datasets
- **Population**: Selective field population

### Connection Pooling

- **MongoDB**: Default Mongoose pooling
- **Redis**: Connection reuse
- **RabbitMQ**: Channel management

### Memory Management

- **Event Listeners**: Proper cleanup
- **Socket Connections**: Automatic disconnect handling
- **Async Operations**: Promise-based flow

---

## 📊 API Response Formats

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "error": "VALIDATION_ERROR",
  "details": {
    "field": "validation error message"
  }
}
```

### Validation Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 6 characters"
    }
  ]
}
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Socket Connection Failed

```javascript
// Check token validity
const isTokenValid = localStorage.getItem("accessToken");
if (!isTokenValid) {
  // Redirect to login
}

// Check server status
fetch("/health").then((response) => {
  if (!response.ok) {
    console.error("Server not available");
  }
});
```

#### 2. Messages Not Receiving

```javascript
// Verify room joining
socket.emit("join_room", { conversationId });

// Check event listeners
socket.on("joined_room", (data) => {
  console.log("Successfully joined:", data.conversationId);
});
```

#### 3. Authentication Errors

```javascript
// Auto-refresh expired tokens
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await refreshToken();
      return axios.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

### Debug Mode

#### Enable Debug Logging

```env
LOG_LEVEL=debug
NODE_ENV=development
```

#### Socket.IO Debug

```javascript
localStorage.debug = "socket.io-client:socket";
```

---

## 📈 Monitoring ve Analytics

### Sentry Dashboard

- **Error Tracking**: Real-time error monitoring
- **Performance**: API endpoint response times
- **User Context**: Request details and user information
- **Releases**: Deploy tracking and error regression

### Logging Strategy

- **Request Logging**: All API requests with response times
- **Error Logging**: Detailed error information with stack traces
- **User Activity**: Login, logout, message sending events
- **System Events**: Database connections, cron job executions

### Health Monitoring

```javascript
// Custom health check endpoint
app.get("/health", async (req, res) => {
  const health = {
    status: "OK",
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabaseConnection(),
      redis: await checkRedisConnection(),
      rabbitmq: await checkRabbitMQConnection(),
    },
  };

  res.json(health);
});
```

---
