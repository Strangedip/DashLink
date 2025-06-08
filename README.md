# DashLink

A web application built with Angular and Firebase.

## Table of Contents

- [About](#about)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Setup](#setup)
- [Project Version](#project-version)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## About

DashLink is a [**add a brief description of your project's purpose and functionality here**]. It leverages Angular for the frontend and Firebase for backend services, providing a robust and scalable solution.

## Features

- [**List key features of your application here, e.g., User Authentication, Data Management, Real-time Updates, etc.**]

## Technologies Used

The following major technologies and libraries are used in this project:

- **Angular**: ^18.2.0
- **Firebase**: ^10.0.0
- **TypeScript**: ~5.5.2
- **PrimeNG**: ^18.0.2
- **PrimeFlex**: ^4.0.0
- **PrimeIcons**: ^7.0.0
- **RxJS**: ~7.8.0
- **Angular CDK**: ^18.2.14
- **Angular Fire**: ^18.0.1
- **Node.js**: 20.19.2 (as specified in volta)

## Setup

Follow these steps to get your development environment set up:

### Prerequisites

Before you begin, ensure you have the following installed:

-   Node.js (version 20.19.2 or higher, as per `volta` in `package.json`)
-   npm (comes with Node.js)
-   Angular CLI (`npm install -g @angular/cli`)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/DashLink.git
    cd DashLink
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Firebase Configuration (if applicable):**
    *   Create a Firebase project at [Firebase Console](https://console.firebase.google.com/).
    *   Set up Firebase Authentication, Firestore, or any other services you use.
    *   Create a `src/environments/environment.ts` (and `environment.prod.ts`) file and add your Firebase configuration:
        ```typescript
        export const environment = {
          production: false,
          firebase: {
            apiKey: "YOUR_API_KEY",
            authDomain: "YOUR_AUTH_DOMAIN",
            projectId: "YOUR_PROJECT_ID",
            storageBucket: "YOUR_STORAGE_BUCKET",
            messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
            appId: "YOUR_APP_ID"
          }
        };
        ```
    *   (Optional) Deploy Firebase rules and indexes:
        ```bash
        firebase deploy --only firestore:rules,firestore:indexes
        ```

### Running the Application

To run the development server:

```bash
ng serve
```

Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Building for Production

To build the project for production:

```bash
ng build
```

The build artifacts will be stored in the `dist/` directory.

### Running Tests

To execute the unit tests via [Karma](https://karma-runner.github.io):

```bash
ng test
```

## Project Version

**Version**: 0.0.0

## Contributing

Contributions are welcome! If you have suggestions or want to contribute:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'feat: Add some feature'`).
5.  Push to the branch (`git push origin feature/your-feature`).
6.  Open a Pull Request.

Please ensure your code adheres to the project's coding standards.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details (if you have one, otherwise replace with your chosen license).

## Contact

For any questions or inquiries, please reach out to:

-   **Your Name/Team Name** - [Your Email Address]
-   **Project Link**: [https://github.com/your-username/DashLink](https://github.com/your-username/DashLink)
