use inventory;

CREATE TABLE `customers` (
  `customer_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `timeStamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `customers`
--

INSERT INTO `customers` (`customer_id`, `name`, `address`, `email`, `timeStamp`) VALUES
('f6zx4lwmkmm8qfu', 'miguel uno ', 'calle camacho', 'miguelu@gmail.com', '2026-01-20 13:14:31'),
('f6zxxcmkgyhkju', 'miguel', 'munaipata', 'miguel@gmail.com', '2026-01-16 14:10:42');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `expenses`
--

CREATE TABLE `expenses` (
  `expense_id` varchar(255) NOT NULL,
  `expense_ref` varchar(255) NOT NULL,
  `supplier_id` varchar(255) NOT NULL,
  `due_date` date NOT NULL,
  `items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`items`)),
  `tax` float DEFAULT NULL,
  `grand_total` float NOT NULL,
  `timeStamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `orders`
--

CREATE TABLE `orders` (
  `order_id` varchar(255) NOT NULL,
  `order_ref` varchar(255) NOT NULL,
  `customer_id` varchar(255) NOT NULL,
  `due_date` date NOT NULL,
  `items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`items`)),
  `tax` float DEFAULT NULL,
  `grand_total` float NOT NULL,
  `timeStamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `orders`
--

INSERT INTO `orders` (`order_id`, `order_ref`, `customer_id`, `due_date`, `items`, `tax`, `grand_total`, `timeStamp`) VALUES
('f6zx1b0mklfqs9n', 'chamarra 1 a', 'f6zx5l4mkfsmcn5', '2026-01-19', '[{\"product_id\":\"f6zx8e0mkfr6dj6\",\"product_name\":\"chamarra 1A\",\"quantity\":1,\"rate\":260}]', 0, 260, '2026-01-19 17:24:50'),
('f6zx1b0mklg8o13', 'E. MAMANI C.', 'f6zx5l4mkfsmcn5', '2026-01-19', '[{\"product_id\":\"f6zx8e0mkfr6dj6\",\"product_name\":\"chamarra 1A\",\"quantity\":1,\"rate\":260}]', 0, 260, '2026-01-19 17:38:44'),
('f6zx4lwmkmm9e3d', 'toletes', 'f6zx4lwmkmm8qfu', '2026-01-20', '[{\"product_id\":\"f6zx8e0mkfr6dj6\",\"product_name\":\"chamarra 1A\",\"quantity\":1,\"rate\":260}]', 0, 260, '2026-01-20 13:15:02'),
('f6zx5l4mkfsn9j8', 'prueba', 'f6zx5l4mkfsmcn5', '2026-01-14', '[{\"product_id\":\"f6zx8e0mkfr6dj6\",\"product_name\":\"chamarra 1A\",\"quantity\":1,\"rate\":260}]', 0, 260, '2026-01-15 18:39:24'),
('f6zxb40mkfujaln', 'uniformes caqui', 'f6zx5l4mkfsmcn5', '2026-01-15', '[{\"product_id\":\"f6zxb40mkfud73b\",\"product_name\":\"chaleco\",\"quantity\":1,\"rate\":90},{\"product_id\":\"f6zx8e0mkfr6dj6\",\"product_name\":\"chamarra 1A\",\"quantity\":1,\"rate\":260}]', 0, 350, '2026-01-15 19:32:18');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `products`
--

CREATE TABLE `products` (
  `product_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `gender` varchar(255) NOT NULL,
  `size` varchar(255) DEFAULT NULL,
  `material` varchar(255) DEFAULT NULL,
  `category` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `product_stock` int(11) NOT NULL,
  `timeStamp` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `image` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `selling_price` float NOT NULL,
  `purchase_price` float NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `products`
--

INSERT INTO `products` (`product_id`, `name`, `gender`, `size`, `material`, `category`, `description`, `product_stock`, `timeStamp`, `image`, `selling_price`, `purchase_price`) VALUES
('f6zx4lwmkmpy6fs', 'chaleco reflectante ', 'female', 'grande', 'tela popelina', 'chamarras', 'ay que quitar', 90, '2026-01-20 14:58:17', NULL, 90, 80),
('f6zx8e0mkfr6dj6', 'chamarra 1A', 'others', 'pequeño ', '', 'chamarrass', '', 8, '2026-01-20 13:15:02', NULL, 260, 200);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proformas`
--

CREATE TABLE `proformas` (
  `id` int(11) NOT NULL,
  `proforma_id` varchar(255) NOT NULL,
  `proforma_ref` varchar(50) NOT NULL,
  `fecha` date NOT NULL,
  `cliente` varchar(255) NOT NULL,
  `celular` varchar(50) NOT NULL,
  `items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`items`)),
  `total_general` float NOT NULL DEFAULT 0,
  `anticipo` float NOT NULL DEFAULT 0,
  `saldo` float NOT NULL DEFAULT 0,
  `estado` varchar(20) NOT NULL DEFAULT 'ACTIVA',
  `timeStamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `proformas`
--

INSERT INTO `proformas` (`id`, `proforma_id`, `proforma_ref`, `fecha`, `cliente`, `celular`, `items`, `total_general`, `anticipo`, `saldo`, `estado`, `timeStamp`) VALUES
(16, '1077c665-99e1-454d-bafe-495efb1d5e2d', '0000016', '2026-01-26', 'HUO', '7985421', '[{\"cantidad\":\"800\",\"detalle\":\"NIKE\",\"precio_unitario\":\"0.5\",\"modo_oferta\":false,\"total\":400}]', 400, 400, 0, 'ACTIVA', '2026-01-26 15:50:57'),
(13, '2fe24561-8a19-4702-8d12-0ffef724011b', '0000013', '2026-01-26', 'XIMENA ALANOCA ', '60132214', '[{\"cantidad\":\"100\",\"detalle\":\"BORDADADO\\nCHAMARRA \\nNIKE PECHO Y ESPALDA \",\"precio_unitario\":\"1.5\",\"modo_oferta\":false,\"total\":150}]', 150, 150, 0, 'ACTIVA', '2026-01-26 15:42:30'),
(14, 'ca26693d-78be-494a-b6c4-cfa121aec6aa', '0000014', '2026-01-26', 'ELOY ALANOCA CHINO ', '65643275', '[{\"cantidad\":\"300\",\"detalle\":\"GUS\",\"precio_unitario\":\"8\",\"modo_oferta\":false,\"total\":2400}]', 2400, 2400, 0, 'ACTIVA', '2026-01-26 15:49:38');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `suppliers`
--

CREATE TABLE `suppliers` (
  `supplier_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `timeStamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `suppliers`
--

INSERT INTO `suppliers` (`supplier_id`, `name`, `address`, `email`, `timeStamp`) VALUES
('f6zxrwmkphi9kt', 'juan', 'calle', 'jhonnyfa1980@gmail.com', '2026-01-22 13:25:16');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user`
--

CREATE TABLE `user` (
  `user_id` varchar(255) NOT NULL,
  `user_name` varchar(255) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `permissions` text NOT NULL,
  `user_role` varchar(255) NOT NULL,
  `image` longtext DEFAULT NULL,
  `timeStamp` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `user`
--

INSERT INTO `user` (`user_id`, `user_name`, `address`, `email`, `password`, `permissions`, `user_role`, `image`, `timeStamp`) VALUES
('001', 'BYATAJIMATEX', 'EL CEIBO ', 'testemp@gmail.com', 'U2FsdGVkX197pZwsr5cyOQcrNst07PbQVhY0yKnhE/U=', '[\n  { \"page\": \"dashboard\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"employees\", \"view\": false, \"create\": false, \"edit\": false, \"delete\": false },\n  { \"page\": \"products\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"suppliers\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"expenses\", \"view\": true, \"create\": false, \"edit\": false, \"delete\": false },\n  { \"page\": \"customers\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"orders\", \"view\": true, \"create\": false, \"edit\": false, \"delete\": false },\n  { \"page\": \"profile\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"settings\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true }\n]', 'employee', NULL, '2026-01-21 14:26:41'),
('002', 'gustavo', 'ventillas', 'gustavo@gmail.com', 'U2FsdGVkX18crPTcaLL85YkQnI0v4+u8AdMvyCdHzZM=', '[\n  { \"page\": \"dashboard\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"employees\", \"view\": false, \"create\": false, \"edit\": false, \"delete\": false },\n  { \"page\": \"products\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"suppliers\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"expenses\", \"view\": true, \"create\": false, \"edit\": false, \"delete\": false },\n  { \"page\": \"customers\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"orders\", \"view\": true, \"create\": false, \"edit\": false, \"delete\": false },\n  { \"page\": \"profile\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"settings\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true }\n]', 'employee', NULL, '2026-01-21 14:10:52'),
('003', 'hola', 'calle mercado ', 'hola@gmail.com', 'U2FsdGVkX1/9ef6QdSARLX+q2ipmqEZMJc2SARZwxQ4=', '[\n  { \"page\": \"dashboard\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"employees\", \"view\": false, \"create\": false, \"edit\": false, \"delete\": false },\n  { \"page\": \"products\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"suppliers\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"expenses\", \"view\": true, \"create\": false, \"edit\": false, \"delete\": false },\n  { \"page\": \"customers\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"orders\", \"view\": true, \"create\": false, \"edit\": false, \"delete\": false },\n  { \"page\": \"profile\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"settings\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true }\n]', 'employee', NULL, '2026-01-21 14:11:02'),
('004', 'EMPRESA BYATAJIMATEX', 'EL CEIBO ', 'testadmin@gmail.com', 'U2FsdGVkX1+JDIPc+fzjCbHU+RA6b9SHwOgt4453Gtw=', '[\r\n  { \"page\": \"dashboard\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\r\n  { \"page\": \"employees\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\r\n  { \"page\": \"products\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\r\n  { \"page\": \"suppliers\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\r\n  { \"page\": \"expenses\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\r\n  { \"page\": \"customers\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\r\n  { \"page\": \"orders\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\r\n  { \"page\": \"profile\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\r\n  { \"page\": \"settings\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\r\n\r\n  { \"page\": \"proformas\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\r\n  { \"page\": \"ventas\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true }\r\n]\r\n', 'admin', NULL, '2026-01-21 14:11:17');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_roles`
--

CREATE TABLE `user_roles` (
  `user_role_id` varchar(255) NOT NULL,
  `user_role_name` varchar(255) NOT NULL,
  `user_role_permissions` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `user_roles`
--

INSERT INTO `user_roles` (`user_role_id`, `user_role_name`, `user_role_permissions`) VALUES
('123232', 'admin', '[\n  { \"page\": \"dashboard\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"employees\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"products\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"suppliers\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"expenses\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"customers\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"orders\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"profile\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"settings\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true }\n]'),
('341242', 'employee', '[\n  { \"page\": \"dashboard\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"employees\", \"view\": false, \"create\": false, \"edit\": false, \"delete\": false },\n  { \"page\": \"products\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"suppliers\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"expenses\", \"view\": true, \"create\": false, \"edit\": false, \"delete\": false },\n  { \"page\": \"customers\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"orders\", \"view\": true, \"create\": false, \"edit\": false, \"delete\": false },\n  { \"page\": \"profile\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true },\n  { \"page\": \"settings\", \"view\": true, \"create\": true, \"edit\": true, \"delete\": true }\n]');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`customer_id`);

--
-- Indices de la tabla `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`expense_id`);

--
-- Indices de la tabla `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`order_id`);

--
-- Indices de la tabla `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`);

--
-- Indices de la tabla `proformas`
--
ALTER TABLE `proformas`
  ADD PRIMARY KEY (`proforma_id`),
  ADD UNIQUE KEY `id` (`id`);

--
-- Indices de la tabla `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`supplier_id`);

--
-- Indices de la tabla `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`user_id`);

--
-- Indices de la tabla `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`user_role_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `proformas`
--
ALTER TABLE `proformas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
