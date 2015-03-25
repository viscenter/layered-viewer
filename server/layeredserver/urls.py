from django.conf.urls import patterns, include, url
from django.contrib import admin
from layeredserver import views

urlpatterns = patterns('',
                       url(r'^$',
                           views.home,
                           name='home'),
                       
                       url(r'^login$',
                           views.login,
                           name='login'),
                       
                       url(r'^(?P<username>\w+)/$',
                           views.username,
                           name='user'),
                       
                       url(r'^(?P<username>\w+)/(?P<collection>\w+)/$',
                           views.collection,
                           name='collection'),
                       
                       url(r'^admin/',
                           include(admin.site.urls)),
)
