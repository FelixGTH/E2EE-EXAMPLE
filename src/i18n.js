const translations = {
  ru: {
    title: 'Сквозное шифрование (E2EE)',
    subtitle: 'Web Crypto API: ECDH (P-256) + AES-GCM (256-bit)',


    tabSetup: 'Установка канала',
    tabKeys: 'Ключи',
    tabChat: 'Чат',
    tabPipeline: 'Процесс',


    setupTitle: 'Установка защищённого канала',
    setupAliceGen: 'Alice: генерация ECDH ключей (P-256)',
    setupBobGen: 'Bob: генерация ECDH ключей (P-256)',
    setupExchange: 'Обмен публичными ключами',
    setupAliceDerive: 'Alice: ECDH(privAlice, pubBob) → AES-256 ключ',
    setupBobDerive: 'Bob: ECDH(privBob, pubAlice) → AES-256 ключ',
    setupVerify: 'Ключи совпадают — безопасный канал установлен',
    keysMatch: 'Ключи идентичны',
    keysNoMatch: 'Ошибка: ключи не совпадают!',
    generating: 'Генерация ключей...',
    regenKeys: 'Перегенерировать ключи',


    sharedSecret: 'Общий секрет',


    server: 'Сервер',
    serverNote: 'Видит только шифротекст — прочитать не может',
    sent: 'Отправлено',
    received: 'Получено',
    send: 'Отправить',
    alicePlaceholder: 'Сообщение от Alice...',
    bobPlaceholder: 'Сообщение от Bob...',


    pipelineEmpty: 'Отправьте сообщение в чате, чтобы увидеть процесс шифрования',
    pipelineTitle: (from, to) => `Процесс шифрования: ${from} → ${to}`,
    pPlain: (from) => `${from}: Открытый текст`,
    pBytes: 'UTF-8 → байты',
    pIv: 'Случайный IV (96 бит)',
    pEncrypt: 'AES-256-GCM шифрование',
    pTransmit: (to) => `Передача через сервер → ${to}`,
    pDecrypt: (to) => `${to}: AES-256-GCM дешифровка`,


    howTitle: 'Как это работает',
    howSteps: [
      ['Генерация ключей:', 'Alice и Bob генерируют пары ECDH-ключей (приватный + публичный) на кривой P-256'],
      ['Обмен:', 'Они обмениваются публичными ключами через открытый канал'],
      ['Общий секрет:', 'Каждый вычисляет ECDH(myPrivate, theirPublic) → одинаковый AES-256 ключ'],
      ['Шифрование:', 'Текст кодируется в UTF-8 байты, генерируется случайный 96-бит IV, шифруется AES-256-GCM'],
      ['Передача:', 'Сервер получает {iv, ciphertext} — прочитать не может, т.к. не знает AES-ключ'],
      ['Дешифровка:', 'Получатель расшифровывает тем же общим ключом'],
    ],
  },

  en: {
    title: 'End-to-End Encryption (E2EE)',
    subtitle: 'Web Crypto API: ECDH (P-256) + AES-GCM (256-bit)',

    tabSetup: 'Channel Setup',
    tabKeys: 'Keys',
    tabChat: 'Chat',
    tabPipeline: 'Pipeline',

    setupTitle: 'Establishing Secure Channel',
    setupAliceGen: 'Alice: generating ECDH key pair (P-256)',
    setupBobGen: 'Bob: generating ECDH key pair (P-256)',
    setupExchange: 'Exchanging public keys',
    setupAliceDerive: 'Alice: ECDH(privAlice, pubBob) → AES-256 key',
    setupBobDerive: 'Bob: ECDH(privBob, pubAlice) → AES-256 key',
    setupVerify: 'Keys match — secure channel established',
    keysMatch: 'Keys are identical',
    keysNoMatch: 'Error: keys do not match!',
    generating: 'Generating keys...',
    regenKeys: 'Regenerate keys',

    sharedSecret: 'Shared Secret',

    server: 'Server',
    serverNote: 'Can only see ciphertext — cannot read content',
    sent: 'Sent',
    received: 'Received',
    send: 'Send',
    alicePlaceholder: 'Message from Alice...',
    bobPlaceholder: 'Message from Bob...',

    pipelineEmpty: 'Send a message in the chat to see the encryption process',
    pipelineTitle: (from, to) => `Encryption process: ${from} → ${to}`,
    pPlain: (from) => `${from}: Plaintext`,
    pBytes: 'UTF-8 → bytes',
    pIv: 'Random IV (96 bits)',
    pEncrypt: 'AES-256-GCM encryption',
    pTransmit: (to) => `Transmit via server → ${to}`,
    pDecrypt: (to) => `${to}: AES-256-GCM decryption`,

    howTitle: 'How it works',
    howSteps: [
      ['Key generation:', 'Alice and Bob each generate ECDH key pairs (private + public) on curve P-256'],
      ['Exchange:', 'They exchange public keys over an open channel'],
      ['Shared secret:', 'Each computes ECDH(myPrivate, theirPublic) → identical AES-256 key'],
      ['Encryption:', 'Text is encoded to UTF-8 bytes, a random 96-bit IV is generated, encrypted with AES-256-GCM'],
      ['Transmission:', 'Server receives {iv, ciphertext} — cannot read it without the AES key'],
      ['Decryption:', 'Recipient decrypts with the same shared key'],
    ],
  },
}

export function getT(lang) {
  return translations[lang] || translations.en
}
