# Global exception handlers

from datetime import datetime,timezone
from fastapi import FastAPI,Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


from app.core.exceptions import AppException

def _error_response(
    request:Request,
    status_code:int,
    code:str,
    message:str,
    details=None,
) -> JSONResponse:
    """
    Build a consistent JSON error response object
    All 4 handlers need to build the same shape.
    """
    return JSONResponse(
        status_code=status_code,
        content={
            "success":False,
            "error": {
                "code":code,
                "message":message,
                "details":details,
            },
            "status_code":status_code,
            # request.url.path shows which endpoint was called
            "path": str(request.url.path),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )

def register_exception_handlers(app:FastAPI)-> None:
    # register all exception handlers on fastapi app
    # called once in main.property
    @app.exception_handler(AppException)
    async def app_exception_handler(request:Request,exc:AppException):
        # handles all our custom exception 
        return _error_response(
            request=request,
            status_code=exc.status_code,
            code=exc.code,
            message=exc.message,
            details=exc.details,
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request:Request,exc:StarletteHTTPException):
        # handles fastapi's builtin httpexedption
        code_map={
             400: "BAD_REQUEST",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            405: "METHOD_NOT_ALLOWED",
            409: "CONFLICT",
            422: "UNPROCESSABLE_ENTITY",
            429: "RATE_LIMITED",
            500: "INTERNAL_ERROR",
            503: "SERVICE_UNAVAILABLE",
        }
        code=code_map.get(exc.status_code,"HTTP_ERROR")
        message=str(exc.detail) if exc.detail else "an error occured"

        return _error_response(
             request=request,
            status_code=exc.status_code,
            code=code,
            message=message,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request:Request, exc: RequestValidationError
    ):
        #         Handles Pydantic schema validation errors (HTTP 422).
        # Format each Pydantic error into something readable
        formatted_errors = []
        for error in exc.errors():
            # `loc` is a tuple like ("body", "title") or ("query", "page")
            # We join with " → " to make it readable: "body → title"
            field_path = " → ".join(str(loc) for loc in error["loc"])
            formatted_errors.append({
                "field": field_path,
                "message": error["msg"],
                # "input" is what the user actually sent
                "value": str(error.get("input", "")) or None,
            })
        return _error_response(
            request=request,
            status_code=422,
            code="VALIDATION_ERROR",
            message="Request validation failed. Check the 'details' field for specifics.",
            details=formatted_errors,
        )


    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        # In production: send this to Sentry, Azure Monitor, etc.
        # For now: print to terminal (visible in your uvicorn logs)
        import traceback
        print(f"\n[UNHANDLED EXCEPTION] {request.method} {request.url}")
        print(traceback.format_exc())
        return _error_response(
            request=request,
            status_code=500,
            code="INTERNAL_ERROR",
            message="An unexpected error occurred. Our team has been notified.",
        )