/**
 * Модуль для логирования с различными уровнями и цветами
 */

// Включено ли детальное логирование
const DEBUG = true;

// Уровни логирования
const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  NONE: 'none'
};

// Текущий уровень логирования
let currentLogLevel = DEBUG ? LogLevel.DEBUG : LogLevel.INFO;

// Цвета для разных уровней
const LogColors = {
  [LogLevel.DEBUG]: '#9e9e9e',  // Серый
  [LogLevel.INFO]: '#2196f3',   // Синий
  [LogLevel.WARN]: '#ff9800',   // Оранжевый
  [LogLevel.ERROR]: '#f44336',  // Красный
};

/**
 * Устанавливает уровень логирования
 * @param {string} level Уровень логирования
 */
const setLogLevel = (level) => {
  if (Object.values(LogLevel).includes(level)) {
    currentLogLevel = level;
  }
};

/**
 * Получить текущий уровень логирования
 * @returns {string} Текущий уровень логирования
 */
const getLogLevel = () => currentLogLevel;

/**
 * Проверяет, нужно ли логировать сообщение данного уровня
 * @param {string} level Уровень сообщения
 * @returns {boolean} Нужно ли логировать
 */
const shouldLog = (level) => {
  const levels = Object.values(LogLevel);
  const currentIndex = levels.indexOf(currentLogLevel);
  const messageIndex = levels.indexOf(level);
  
  return currentIndex <= messageIndex;
};

/**
 * Логирует сообщение определенного уровня
 * @param {string} level Уровень сообщения
 * @param {string} module Название модуля
 * @param {...any} args Аргументы для логирования
 */
const log = (level, module, ...args) => {
  if (level === LogLevel.NONE || !shouldLog(level)) return;
  
  const timestamp = new Date().toISOString().substring(11, 19);
  const prefix = `%c[${timestamp}][${module}]`;
  const style = `color: ${LogColors[level]}; font-weight: bold;`;
  
  switch (level) {
    case LogLevel.DEBUG:
      console.debug(prefix, style, ...args);
      break;
    case LogLevel.INFO:
      console.info(prefix, style, ...args);
      break;
    case LogLevel.WARN:
      console.warn(prefix, style, ...args);
      break;
    case LogLevel.ERROR:
      console.error(prefix, style, ...args);
      break;
    default:
      break;
  }
};

/**
 * Создает логгер для конкретного модуля
 * @param {string} moduleName Название модуля
 * @returns {object} Объект с методами логирования
 */
const createLogger = (moduleName) => ({
  debug: (...args) => log(LogLevel.DEBUG, moduleName, ...args),
  info: (...args) => log(LogLevel.INFO, moduleName, ...args),
  warn: (...args) => log(LogLevel.WARN, moduleName, ...args),
  error: (...args) => log(LogLevel.ERROR, moduleName, ...args),
});

export {
  LogLevel,
  setLogLevel,
  getLogLevel,
  createLogger
};