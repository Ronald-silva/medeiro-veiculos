// Script para corrigir URLs de imagens no Supabase
// Troca medeirosveiculos.online -> www.medeirosveiculos.online
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const OLD_BASE = 'https://medeirosveiculos.online';
const NEW_BASE = 'https://www.medeirosveiculos.online';

async function fixUrls() {
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, name, main_image_url, images');

  if (error) {
    console.error('Erro ao buscar veículos:', error);
    return;
  }

  console.log(`Encontrados ${vehicles.length} veículos`);

  for (const v of vehicles) {
    const updates = {};

    if (v.main_image_url && v.main_image_url.includes(OLD_BASE) && !v.main_image_url.includes('www.')) {
      updates.main_image_url = v.main_image_url.replace(OLD_BASE, NEW_BASE);
    }

    if (v.images && Array.isArray(v.images)) {
      const fixedImages = v.images.map(url =>
        url.includes(OLD_BASE) && !url.includes('www.')
          ? url.replace(OLD_BASE, NEW_BASE)
          : url
      );
      if (JSON.stringify(fixedImages) !== JSON.stringify(v.images)) {
        updates.images = fixedImages;
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('id', v.id);

      if (updateError) {
        console.error(`Erro ao atualizar ${v.name}:`, updateError);
      } else {
        console.log(`✅ ${v.name}: URLs atualizadas`);
        if (updates.main_image_url) console.log(`   main: ${updates.main_image_url}`);
      }
    } else {
      console.log(`⏭️  ${v.name}: já está correto`);
    }
  }

  console.log('\nConcluído!');
}

fixUrls();
