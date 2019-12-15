FROM node:8
LABEL maintainer "Nitin Goyal <nitingoyal.dev@gmail.com>, Luke Busstra <luke.busstra@gmail.com>"

ENV NGINX_CODENAME stretch

# install requirements and NGINX
RUN echo "deb http://nginx.org/packages/debian/ ${NGINX_CODENAME} nginx" >> /etc/apt/sources.list \
	&& apt-get update && apt-get install --no-install-recommends --no-install-suggests -y --force-yes \
		bash \
		zip \
		unzip \
		wget \
		curl \
		nano \
		ca-certificates \
		nginx

# copy project - LOCAL CODE
RUN mkdir -p /var/www/vamshop-dashboard
ADD . /var/www/vamshop-dashboard

WORKDIR /var/www/vamshop-dashboard

# Nginx config
COPY nginx/nginx.conf /etc/nginx/
COPY nginx/default.conf /etc/nginx/conf.d/

# script to run Nginx and PM2
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x "/usr/local/bin/docker-entrypoint.sh"

# build project
RUN cd /var/www/vamshop-dashboard \
	&& npm install \
	&& npm cache clean --force \
	&& npm run build

EXPOSE 80

# start env build and Nginx
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

