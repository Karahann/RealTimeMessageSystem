# Node.js imajını kullan
FROM node:18

# Uygulama dizini oluştur
WORKDIR /app

# package.json ve lock dosyasını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm install

# Uygulama dosyalarını kopyala
COPY . .

# Port belirt (opsiyonel ama faydalı)
EXPOSE 3000

# Başlatma komutu (senin package.json dosyana göre)
CMD ["npm","run", "start"]
