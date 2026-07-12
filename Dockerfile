# 1. Isticmaal Node.js LTS image
FROM node:20-slim

# 2. Sameey galka shaqada ee bot-ka
WORKDIR /usr/src/app

# 3. Nuqul ka sameey faylasha package-ka
COPY package*.json ./

# 4. Ku shub maktabadaha (libraries) uu bot-ku u baahan yahay
RUN npm install --production

# 5. Nuqul ka sameey koodhka bot-ka oo dhan
COPY . .

# 6. Amarka lagu kicinayo bot-ka
CMD ["npm", "start"]
