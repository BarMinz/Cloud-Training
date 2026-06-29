FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    systemd systemd-sysv \
    nano vim \
    apache2 \
    curl wget \
    net-tools iputils-ping \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Remove units that fail or are irrelevant inside a container
RUN find /etc/systemd/system /lib/systemd/system -path '*.wants/*' \
    \( -name '*getty*' -o -name '*apt-daily*' -o -name '*systemd-timesyncd*' \
       -o -name '*systemd-resolved*' -o -name '*systemd-networkd*' \
       -o -name '*systemd-udevd*' -o -name '*systemd-modules-load*' \) \
    -delete 2>/dev/null; true

STOPSIGNAL SIGRTMIN+3
CMD ["/sbin/init"]
