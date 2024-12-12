import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center p-12">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
