package com.oj.system.test.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.oj.system.test.entity.TestInfo;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface TestMapper extends BaseMapper<TestInfo> {

}
