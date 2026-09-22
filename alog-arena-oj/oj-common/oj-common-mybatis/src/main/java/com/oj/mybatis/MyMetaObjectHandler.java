package com.oj.mybatis;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class MyMetaObjectHandler implements MetaObjectHandler {


    @Override
    public void insertFill(MetaObject metaObject) {
        //创建人,获取当前用户信息
        //TODO 目前写死,后面实现获取当前用户信息的接口
        this.strictInsertFill(metaObject, "createBy", Long.class, 2095927408837951490L);

        this.strictInsertFill(metaObject, "createTime", LocalDateTime.class, LocalDateTime.now());

        this.strictInsertFill(metaObject, "updateBy", Long.class, 2095927408837951490L);

        this.setFieldValByName("updateTime", LocalDateTime.now(), metaObject);
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        // 更新操作必须覆盖实体中已有的审计值，不能使用只在字段为 null 时生效的 strictUpdateFill。
        this.setFieldValByName("updateBy", 2095927408837951490L, metaObject);
        this.setFieldValByName("updateTime", LocalDateTime.now(), metaObject);
    }
}
