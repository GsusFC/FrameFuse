import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { App } from './App';
describe('App', () => {
    it('renders header and panels', () => {
        render(_jsx(App, {}));
        expect(screen.getByText('FrameFuse')).toBeInTheDocument();
        expect(screen.getByText('Añadir imágenes')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Preview' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Exportar' })).toBeInTheDocument();
    });
});
//# sourceMappingURL=App.test.js.map