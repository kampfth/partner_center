<?php
// Auto-redirect to setup if not configured
if (!file_exists(__DIR__ . '/.env') || !file_exists(__DIR__ . '/backend/secrets.php')) {
    header("Location: /backend/setup.php");
    exit;
}

require 'backend/auth.php';

// Se não estiver logado, o checkAuth() já redireciona para backend/login.php
checkAuth();

// Se chegou aqui, está logado. Carrega o React App.
echo file_get_contents(__DIR__ . '/app.html');

