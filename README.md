# Auction Platform

This project is a web application for an auction platform built using Django for the backend and React for the frontend. It allows users to create, bid on, and manage auctions, as well as handle user authentication and profiles.

## Project Structure

```
AutoAuction
├── backend
│   ├── auction                # Auction application
│   ├── users                  # User management application
│   ├── config                 # Project configuration
│   ├── media                  # Directory for uploaded files
│   ├── db.sqlite3            # SQLite database
│   ├── manage.py              # Django management script
│   └── requirements.txt       # Python dependencies
└── frontend
    ├── public                 # Public files (e.g., index.html)
    ├── src                    # Source code for React application
    ├── package.json           # React dependencies
    └── .env                   # Environment configuration
```

## Backend

The backend is built using Django and Django Rest Framework (DRF). It consists of two main applications:

- **Auction**: Handles all auction-related functionalities, including creating auctions, placing bids, and managing auction history.
- **Users**: Manages user registration, authentication, and profiles.

### Key Files

- `manage.py`: Command-line utility for managing the Django project.
- `requirements.txt`: Lists the required Python packages.

## Frontend

The frontend is built using React. It provides a user-friendly interface for interacting with the auction platform.

### Key Files

- `public/index.html`: The main HTML file for the React application.
- `src/App.jsx`: The main application component that handles routing.
- `src/api/`: Contains files for making API calls to the backend.

## Getting Started

### Prerequisites

- Python 3.x
- Node.js and npm

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd project-name
   ```

2. Set up the backend:
   - Navigate to the `backend` directory.
   - Install the required Python packages:
     ```
     pip install -r requirements.txt
     ```
   - Run migrations:
     ```
     python manage.py migrate
     ```
   - Start the Django server:
     ```
     python manage.py runserver
     ```

3. Set up the frontend:
   - Navigate to the `frontend` directory.
   - Install the required Node packages:
     ```
     npm install
     ```
   - Start the React application:
     ```
     npm start
     ```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
