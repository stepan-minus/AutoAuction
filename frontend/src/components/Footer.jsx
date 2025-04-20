import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-columns">
            <div className="footer-column">
              <h3>О НАС</h3>
              <p>
                Auto Auction – лучшая платформа для аукционов автомобилей в 
                России. Мы делаем процесс покупки и продажи автомобилей 
                прозрачным, удобным и безопасным.
              </p>
            </div>
            
            <div className="footer-column">
              <h3>НАВИГАЦИЯ</h3>
              <ul className="footer-links">
                <li><Link to="/">Главная</Link></li>
                <li><Link to="/create-auction">Создать аукцион</Link></li>
                <li><Link to="/profile">Личный кабинет</Link></li>
                <li><Link to="/conversations">Сообщения</Link></li>
              </ul>
            </div>
            
            <div className="footer-column">
              <h3>КОНТАКТЫ</h3>
              <ul className="footer-contacts">
                <li>
                  <i className="fas fa-phone"></i>
                  <a href="tel:+79001234567">+7 (900) 123-45-67</a>
                </li>
                <li>
                  <i className="fas fa-envelope"></i>
                  <a href="mailto:carauction228@gmail.com">carauction228@gmail.com</a>
                </li>
                <li>
                  <i className="fas fa-map-marker-alt"></i>
                  <span>Москва, ул. Автомобильная, д. 10, офис 228</span>
                </li>
              </ul>
            </div>
            
            <div className="footer-column">
              <h3>МЫ В СОЦСЕТЯХ</h3>
              <div className="social-links">
                <a href="https://vk.com/" target="_blank" rel="noopener noreferrer">
                  <i className="fab fa-vk"></i>
                </a>
                <a href="https://t.me/" target="_blank" rel="noopener noreferrer">
                  <i className="fab fa-telegram"></i>
                </a>
                <a href="https://youtube.com/" target="_blank" rel="noopener noreferrer">
                  <i className="fab fa-youtube"></i>
                </a>
                <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer">
                  <i className="fab fa-instagram"></i>
                </a>
              </div>
            </div>
          </div>
          
          <div className="footer-info">
            <p>
              Мы используем cookies для улучшения пользовательского опыта. 
              Продолжая использовать сайт, вы соглашаетесь с нашей 
              <a href="#"> политикой конфиденциальности</a> и 
              <a href="#"> условиями использования</a>.
            </p>
          </div>
          
          <div className="footer-bottom">
            <div className="copyright">
              <p>© {currentYear} АвтоАукцион. Все права защищены.</p>
            </div>
            <div className="legal-info">
              <p>
                ООО "АвтоАукцион" ИНН: 1234567890 / ОГРН: 1234567890123
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;