export default () => ({
    port: parseInt(process.env.PORT, 10) || 3000,
    mongoURI: process.env.MONGO_DATABASE_URL,
    NODE_ENV:process.env.NODE_ENV,
    KEYCLOAK_SERVER_URI: process.env.KEYCLOAK_SERVER_URI,
    KEYCLOAK_SERVER_REALM: process.env.KEYCLOAK_SERVER_REALM,
    KEYCLOAK_CLIENT_UUID: process.env.KEYCLOAK_CLIENT_UUID,
    // Keycloak Admin API (already configured)
    // TICKET_ASSIGNMENT_CLIENT_ID: process.env.TICKET_ASSIGNMENT_CLIENT_ID,
    // TICKET_ASSIGNMENT_CLIENT_SECRET: process.env.TICKET_ASSIGNMENT_CLIENT_SECRET,
    // Email Configuration
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: parseInt(process.env.SMTP_PORT, 10) || 587,
    SMTP_SECURE: process.env.SMTP_SECURE === 'true',
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL,
    SMTP_TEST_EMAIL: process.env.SMTP_TEST_EMAIL,
    FRONTEND_URL: process.env.FRONTEND_URL,
    //MOMO API
    MOMO_API_DEFAULT_UUID:process.env.MOMO_API_DEFAULT_UUID,  
    MOMO_API_PRIMARY_KEY:process.env.MOMO_API_PRIMARY_KEY,   
    MOMO_API_SECONDARY_KEY:process.env.MOMO_API_SECONDARY_KEY,  
    MOMO_API_KEY:process.env.MOMO_API_KEY,  
    MOMO_API_PATH:process.env.MOMO_API_PATH,  
    MOMO_API_MODE_ENV:process.env.MOMO_API_MODE_ENV,

    OM_API_PATH:process.env.OM_API_PATH,
    OM_API_MERCHANT_KEY:process.env.OM_API_MERCHANT_KEY,
    OM_API_USERNAME:process.env.OM_API_USERNAME,
    OM_API_PASSWORD:process.env.OM_API_PASSWORD,
    OM_API_X_AUTH_TOKEN:process.env.OM_API_X_AUTH_TOKEN,
    OM_API_CHANNELUSERMSISDN:process.env.OM_API_CHANNELUSERMSISDN,
    OM_API_PIN:process.env.OM_API_PIN,

    SECRET_ENCRIPTION_ALGORITHM:process.env.SECRET_ENCRIPTION_ALGORITHM,
    SECRET_ENCRIPTION_KEY:process.env.SECRET_ENCRIPTION_KEY
});