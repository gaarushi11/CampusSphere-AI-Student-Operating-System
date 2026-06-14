const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cwmjrvumzuzkewqqgbox.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3bWpydnVtenV6a2V3cXFnYm94Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMzMTMxOCwiZXhwIjoyMDk2OTA3MzE4fQ.1zDKTXe4ziFAQy5vgo8yA59V5oPMaHsmpgyzPmewobE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  const { data: docs, error } = await supabase
    .from('documents')
    .select('name, index_error')
    .not('index_error', 'is', null)
    .order('uploaded_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Error fetching:', error);
  } else {
    console.log("Recent failed documents:");
    console.log(docs);
  }
}

checkDb();
