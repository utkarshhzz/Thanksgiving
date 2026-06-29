# Custom exception classes for thankgiving platorm

class AppException(Exception):
    # Baseclass for all exceptions
    status_code:int=500
    code:str="INTERNAL_ERROR"
    message:str="An unexpected error occured"

    def __init__(self,message:str | None=None,details=None):
        if message:
            self.message=message
        self.details=details
        super().__init__(self.message)

class NotFoundError(AppException):
    # we will use when a resource doesnot exist in database
    status_code=404
    code="NOT_FOUND"
    message:str="Resource not Found"

class ForbiddenError(AppException):
    # Used when user is authenticated but lacks permission
    status_code=403
    code="FORBIDDEN"
    message="You donot have permission to perform this action"

class UnauthorizedError(AppException):
    # used when user is not autheenticated
    status_code=401
    code="UNAUTHORIZED"
    message="Authentication Required"

class ConflictError(AppException):
    # used when creating something that already exists
    status_code=409
    code="CONFLICT"
    message="Resource already exists"

class ValidationError(AppException):
    # used when validation fails that pydantic cant catch
    status_code=422
    code="BUSINESS_RULE_VIOLATION"
    message="The request violates a business rule"

class BadRequestError(AppException):
    # used when request is syntactically correct but semantically wrong
    status_code=400
    code="BAD_REQUEST"
    message="Bad Request"

class ServiceUnavailableError(AppException):
    # Use when a downstream service (payment, email) is unavailable.
    status_code = 503
    code = "SERVICE_UNAVAILABLE"
    message = "Service temporarily unavailable"

    