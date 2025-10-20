"""
Point d'entrée Lambda - Wrapper pour get_user_searches
"""
from get_user_searches import lambda_handler

# AWS Lambda cherchera lambda_function.lambda_handler
# Cette fonction redirige vers get_user_searches.lambda_handler
