import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Button } from 'react-bootstrap';

const SuccessPage = ({ message, backPath, backText }) => {
    return (
        <Container className="success-page-container">
            <div className="success-card">
                <div className="success-icon">
                    <i className="fas fa-check-circle"></i>
                </div>
                
                <h1 className="success-title">УСПЕШНО!</h1>
                
                <div className="success-message">
                    {message || 'Операция выполнена успешно.'}
                </div>
                
                <div className="success-actions">
                    <Link to={backPath || '/'}>
                        <Button className="success-button">
                            {backText || 'Вернуться на главную'}
                        </Button>
                    </Link>
                </div>
            </div>
        </Container>
    );
};

export default SuccessPage;