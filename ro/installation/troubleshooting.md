---
lang: ro
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
permalink: /example_translation/installation/troubleshooting/
chapter: installation
section: troubleshooting
prev_section: upgrading
---


# Troubleshooting & FAQ <a id="troubleshooting"></a>

<dl>
    <dt id="export-path">'/usr/local/bin' nu apare în $PATH</dt>
    <dd>Adaugă-l urmărind pașii:
        <ul>
            <li>În linia de comandă scrie <code>cd ~</code>, pentru a naviga în folderul inițial</li>
            <li>Execută <code>ls -al</code> pentru a vedea toate folderele și fișierele, inclusiv pe cele ascunse</li>
            <li>Ar trebui să veși un fișier numit <code class="path">.profile</code> sau <code class="path">.bash_profile</code>, dacă nu, execută <code>touch .bash_profile</code> pentru a-l crea.</li>
            <li>Execută <code>open -a Textedit .bash_profile</code> pentru a deschide fișierul cu Textedit.</li>
            <li>Adaugă <code>export PATH=$PATH:/usr/local/bin/</code> la finalul fișierului și salvează</li>
            <li>Schimbarea va fi vizibilă după ce redeschizi linia de comandă. Inchide și redeschide-o, apoi execută <code>echo $PATH</code> pentru a verifica dacă '/usr/local/bin/' este prezent.</li>
        </ul>
    </dd>
    <dt id="sqlite3-errors">SQLite3 nu s-a instalat</dt>
    <dd>
        <p>Pachetul SQLite3 vine cu executabile precompilate pentru cele mai comuni arhitecturi. Dacă folosești o variantă de Linux mai puțin populară sau altă variantă de Unix, s-ar putea ca SQLite3 să îți returneze o eroare 404, în cazul în care nu găsește executabilele pentru platforma ta.</p>
        <p>Problema se poate remedia forțând SQLite3 să se compileze. Este obligatoriu să aveți Python și gcc preinstalate. Incercați această metodă executând <code>npm install sqlite3 --build-from-source</code></p>
        <p>If it won't build you're probably missing one of the python or gcc dependencies, on linux try running <code>sudo npm install -g node-gyp</code>, <code>sudo apt-get install build-essential</code> and <code>sudo apt-get install python-software-properties python g++ make</code> before retrying the build from source.</p>
        <p>Dacă nu se compilează, probabil îți lipsesc una din cerințe. Pe Linux încearcă să rulezi <code>sudo npm install -g node-gyp</code>, <code>sudo apt-get install build-essential</code> și <code>sudo apt-get install python-software-properties python g++ make</code> înainte de a încerca să compilați manual.</p>
        <p>Pentru mai multe informații despre compilarea executabilelor, vezi <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries">https://github.com/developmentseed/node-sqlite3/wiki/Binaries</a></p>
        <p>Once you have successfully built a binary for your platform, please follow the <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries#creating-new-binaries">instructions here</a> to submit the binary to the node-sqlite project, so that future users won't have the same problem.</p>
        <p>După ce ai compilat executabilul pentru platforma ta, urmează <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries#creating-new-binaries">instrucțiunile de aici</a> pentru a trimite executabilul proiectului node-sqlite pentru ca cei care vin după tine să nu aibă aceeași problemă.</p>
    </dd>
    <dt id="image-uploads">Nu pot încărca imagini</dt>
    <dd>
        <p>Dacă ești pe DigitalOcean Droplet și ai configurat Ghost pe versiunea 0.3.2 sau folosești nginx pe altă platformă, s-ar putea să nu poți încărca imagini.</p>
        <p>Problema e că nu poți încărca imagini mai mari de 1MB(o imagine de dimensiuni mici va merge); dar e o limită foarte mică!</p>
        <p>Pentru a mări limita trebuie să modifici configurația nginx și să setați limita la ceva mai mare.</p>
        <ul>
            <li>Loghează-te pe server și execută <code>sudo nano /etc/nginx/conf.d/default.conf</code> pentru a deschide fișierul configurației.</li>
            <li>După linia <code>server_name</code>, adaugă: <code>client_max_body_size 10M;</code></li>
            <li>Apoi apasă <kbd>ctrl</kbd> + <kbd>x</kbd> pentru a ieși. Nano te va întreba dacă vrei să salvezi; apasă <kbd>y</kbd> pentru da, și apasă <kbd>enter</kbd> pentru a salva fișierul.</li>
        </ul>
    </dd>
</dl>

