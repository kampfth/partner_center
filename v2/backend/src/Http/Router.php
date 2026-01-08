<?php
/**
 * Simple HTTP Router
 */

declare(strict_types=1);

namespace App\Http;

class Router
{
    private array $routes = [];
    private array $middleware = [];

    public function get(string $pattern, callable $handler, bool $public = false): void
    {
        $this->addRoute('GET', $pattern, $handler, $public);
    }

    public function post(string $pattern, callable $handler, bool $public = false): void
    {
        $this->addRoute('POST', $pattern, $handler, $public);
    }

    public function patch(string $pattern, callable $handler, bool $public = false): void
    {
        $this->addRoute('PATCH', $pattern, $handler, $public);
    }

    public function delete(string $pattern, callable $handler, bool $public = false): void
    {
        $this->addRoute('DELETE', $pattern, $handler, $public);
    }

    public function put(string $pattern, callable $handler, bool $public = false): void
    {
        $this->addRoute('PUT', $pattern, $handler, $public);
    }

    public function addMiddleware(callable $middleware): void
    {
        $this->middleware[] = $middleware;
    }

    private function addRoute(string $method, string $pattern, callable $handler, bool $public): void
    {
        // Convert pattern to regex (e.g., /api/products/{id} -> /api/products/(?P<id>[^/]+))
        $regex = preg_replace('/\{([a-zA-Z_]+)\}/', '(?P<$1>[^/]+)', $pattern);
        $regex = '#^' . $regex . '$#';

        $this->routes[] = [
            'method' => $method,
            'pattern' => $pattern,
            'regex' => $regex,
            'handler' => $handler,
            'public' => $public,
        ];
    }

    public function dispatch(Request $request): Response
    {
        // Handle OPTIONS for CORS preflight
        if ($request->method === 'OPTIONS') {
            return new Response(204);
        }

        foreach ($this->routes as $route) {
            if ($route['method'] !== $request->method) {
                continue;
            }

            if (preg_match($route['regex'], $request->path, $matches)) {
                // Extract named params
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);

                // Run middleware for non-public routes
                if (!$route['public']) {
                    foreach ($this->middleware as $mw) {
                        $result = $mw($request);
                        if ($result instanceof Response) {
                            return $result;
                        }
                    }
                }

                return ($route['handler'])($request, $params);
            }
        }

        return Response::error('Not Found', 'NOT_FOUND', 404);
    }
}
