package com.oj.system.test.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("tb_test")
public class TestInfo {
    private Integer testId;
    private String title;
}
