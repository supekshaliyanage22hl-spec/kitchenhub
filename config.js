/* Fill these in once. Used by index.html (customers) and admin.html (you). */
const CFG={
  SUPABASE_URL:"https://fgklqzuzodwwkjvhlkbg.supabase.co",            // e.g. https://abcd1234.supabase.co
  SUPABASE_KEY:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZna2xxenV6b2R3d2tqdmhsa2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNzU5NDAsImV4cCI6MjEwNjc1MTk0MH0.0EsoJJOkSmZJm8ObLqRvk0HZInb4_lyAfgf_Udr6DSY",            // the public "anon" key
  WHATSAPP:"94762805776",     // country code + number, digits only
  EMAIL:"supekshaliyanage22hl@gmail.com",
  COMPANY:"The Kitchen Hub",
  TAGLINE:"Smart Kitchen Solution (Pvt) Ltd",
  PER_PAGE:4
};

/* Tidy common copy-paste mistakes (trailing slash, /rest/v1, stray spaces) */
CFG.SUPABASE_URL=CFG.SUPABASE_URL.trim().replace(/\/rest\/v1\/?$/,"").replace(/\/+$/,"");
CFG.SUPABASE_KEY=CFG.SUPABASE_KEY.trim();
