begin;

-- A função com catálogo continua chamando a função original como proprietária.
-- O perfil autenticado usa somente a função que valida materiais e quantidades.
revoke execute on function public.submit_website_request(text,uuid,text,text,text[],date,text,text)
  from authenticated;

commit;
