from django.http import HttpResponse

def home(request):
    return HttpResponse("Home")

def login(request):
    return HttpResponse("Login")

def username(request, username):
    return HttpResponse("Username")

def collection(request, username, collection):
    return HttpResponse("Collection")
