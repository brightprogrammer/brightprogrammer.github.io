rm -rf public.tmp
mv public public.tmp
hugo build 
rsync -avz $PWD/public/ apprentice@arcana.local:/var/www/my-site/
