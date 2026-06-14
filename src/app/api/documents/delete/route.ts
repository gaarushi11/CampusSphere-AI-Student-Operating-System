import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function DELETE(req: NextRequest) {
  try {
    const { documentId, userId } = await req.json() as {
      documentId: string;
      userId: string;
    };

    if (!documentId || !userId) {
      return NextResponse.json({ error: 'Missing documentId or userId' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Fetch the file_path before deleting (need it to remove from storage)
    let filePath = null;
    try {
      const { data: doc, error: fetchError } = await supabase
        .from('documents')
        .select('file_path')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single();
        
      if (!fetchError && doc) {
        filePath = doc.file_path;
      } else {
        console.warn('Could not fetch file_path for storage deletion:', fetchError?.message);
      }
    } catch (e) {
      console.warn('Error fetching file_path:', e);
    }

    // 2. Delete document_chunks
    await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId);

    // 3. Delete the document row
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // 4. Remove file from Supabase Storage
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('vault_files')
        .remove([filePath]);

      if (storageError) {
        console.warn('[Delete] Storage removal warning:', storageError.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
