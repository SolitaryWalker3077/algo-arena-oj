use oj_dev;
drop table if exists `tb_sys_user`;

create table `tb_sys_user` (
    `user_id` bigint(20) unsigned NOT NULL COMMENT '⽤⼾id',
    `user_account` varchar(32) DEFAULT NULL COMMENT '⽤⼾账号',
    `password` varchar(100) DEFAULT NULL COMMENT '⽤⼾密码',
    `nick_name` varchar(32) DEFAULT NULL COMMENT '昵称',
    `create_by` bigint(8) NOT NULL COMMENT '创建⽤⼾',
    `create_time` datetime NOT NULL COMMENT '创建时间',
    `update_by` bigint(8) DEFAULT NULL COMMENT '更新⽤⼾',
    `update_time` datetime DEFAULT NULL COMMENT '更新时间',
    PRIMARY KEY (`user_id`),
    UNIQUE KEY `user_account` (`user_account`)
)  ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理端⽤⼾表'