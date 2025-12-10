import { render, screen, fireEvent } from '@testing-library/react';
import { AddBookmarkModal } from '../components/AddBookmarkModal';
import { vi } from 'vitest';

describe('AddBookmarkModal', () => {
  it('should allow creating a new category', async () => {
    const onAdd = vi.fn();
    render(
      <AddBookmarkModal
        isOpen={true}
        onClose={() => {}}
        onAdd={onAdd}
        isProcessing={false}
      />
    );
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Test Bookmark' },
    });
    fireEvent.change(screen.getByLabelText('URL'), {
      target: { value: 'https://test.com' },
    });
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: '___custom___' },
    });
    fireEvent.change(screen.getByPlaceholderText('Type new category name...'), {
      target: { value: 'My New Category' },
    });
    fireEvent.click(screen.getByText('Add Bookmark'));
    expect(onAdd).toHaveBeenCalledWith(
      'Test Bookmark',
      'https://test.com',
      'My New Category'
    );
  });
});
