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
    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('file_path')
      .eq('id', documentId)
      .eq('user_id', userId)  // ownership check
      .single();

    if (fetchError || !doc) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
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
    if (doc.file_path) {
      const { error: storageError } = await supabase.storage
        .from('vault_files')
        .remove([doc.file_path]);

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
